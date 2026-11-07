const { isConfigured, supabaseAdmin } = require('../config/supabase');
const geminiService = require('../services/geminiService');
const { checkAndAwardAchievements } = require('../services/gamificationService');
const { successResponse, errorResponse, localStore, generateId } = require('../utils/helpers');

async function generateFlashcards(req, res) {
  try {
    const userId = req.user.id;
    const { subject = 'General', topic = 'Topic', content = '', count = 6 } = req.body;

    if (!topic) {
      return errorResponse(res, 'Topic is required', 400);
    }

    const cards = await geminiService.generateFlashcards({
      subject,
      topic,
      content,
      count: parseInt(count, 10) || 6
    });

    const savedCards = [];

    if (isConfigured && supabaseAdmin) {
      const rows = cards.map(c => ({
        user_id: userId,
        subject,
        topic,
        front: c.front,
        back: c.back,
        mastery_level: 'learning',
        created_at: new Date().toISOString()
      }));

      const { data, error } = await supabaseAdmin.from('flashcards').insert(rows).select();
      if (error) return errorResponse(res, 'Failed to save flashcards', 500, error);
      savedCards.push(...(data || []));
    } else {
      cards.forEach(c => {
        const id = generateId();
        const cardObj = {
          id,
          user_id: userId,
          subject,
          topic,
          front: c.front,
          back: c.back,
          mastery_level: 'learning',
          created_at: new Date().toISOString()
        };
        localStore.flashcards.set(id, cardObj);
        savedCards.push(cardObj);
      });
    }

    return successResponse(res, savedCards, 'Flashcards generated successfully', 201);
  } catch (err) {
    return errorResponse(res, 'Error generating flashcards', 500, err);
  }
}

async function listFlashcards(req, res) {
  try {
    const userId = req.user.id;
    const { topic } = req.query;
    let cards = [];

    if (isConfigured && supabaseAdmin) {
      let query = supabaseAdmin.from('flashcards').select('*').eq('user_id', userId);
      if (topic) query = query.eq('topic', topic);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) return errorResponse(res, 'Failed to fetch flashcards', 500, error);
      cards = data || [];
    } else {
      cards = Array.from(localStore.flashcards.values())
        .filter(c => c.user_id === userId && (!topic || c.topic === topic))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return successResponse(res, cards, 'Flashcards retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching flashcards', 500, err);
  }
}

async function updateFlashcardMastery(req, res) {
  try {
    const userId = req.user.id;
    const cardId = req.params.id;
    const { mastery_level } = req.body;

    if (!['learning', 'reviewing', 'mastered'].includes(mastery_level)) {
      return errorResponse(res, 'Invalid mastery level', 400);
    }

    let updated = null;

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('flashcards')
        .update({ mastery_level, updated_at: new Date().toISOString() })
        .eq('id', cardId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return errorResponse(res, 'Failed to update flashcard', 500, error);
      updated = data;
    } else {
      const card = localStore.flashcards.get(cardId);
      if (!card || card.user_id !== userId) return errorResponse(res, 'Card not found', 404);
      card.mastery_level = mastery_level;
      card.updated_at = new Date().toISOString();
      updated = card;
    }

    // Check Flashcard Wizard achievement
    let masteredCount = 0;
    if (isConfigured && supabaseAdmin) {
      const { count } = await supabaseAdmin.from('flashcards').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('mastery_level', 'mastered');
      masteredCount = count || 0;
    } else {
      masteredCount = Array.from(localStore.flashcards.values()).filter(c => c.user_id === userId && c.mastery_level === 'mastered').length;
    }
    await checkAndAwardAchievements(userId, { flashcardsMastered: masteredCount });

    return successResponse(res, updated, 'Flashcard updated');
  } catch (err) {
    return errorResponse(res, 'Error updating flashcard', 500, err);
  }
}

async function deleteFlashcard(req, res) {
  try {
    const userId = req.user.id;
    const cardId = req.params.id;

    if (isConfigured && supabaseAdmin) {
      await supabaseAdmin.from('flashcards').delete().eq('id', cardId).eq('user_id', userId);
    } else {
      const card = localStore.flashcards.get(cardId);
      if (card && card.user_id === userId) {
        localStore.flashcards.delete(cardId);
      }
    }

    return successResponse(res, { id: cardId }, 'Flashcard deleted');
  } catch (err) {
    return errorResponse(res, 'Error deleting flashcard', 500, err);
  }
}

module.exports = {
  generateFlashcards,
  listFlashcards,
  updateFlashcardMastery,
  deleteFlashcard
};

