const { isConfigured, supabaseAdmin } = require('../config/supabase');
const geminiService = require('../services/geminiService');
const pdfService = require('../services/pdfService');
const { successResponse, errorResponse, localStore, generateId } = require('../utils/helpers');
const { checkAndAwardAchievements } = require('../services/gamificationService');

/**
 * Handle PDF File Upload & Text Extraction
 */
async function extractPdfText(req, res) {
  try {
    if (!req.file) {
      return errorResponse(res, 'No PDF file uploaded', 400);
    }

    if (req.file.mimetype !== 'application/pdf') {
      return errorResponse(res, 'Uploaded file must be a PDF document', 400);
    }

    const result = await pdfService.extractTextFromPDF(req.file.buffer);

    if (result.requiresOCR) {
      return res.status(200).json({
        success: false,
        requiresOCR: true,
        message: result.message,
        pageCount: result.pageCount
      });
    }

    return successResponse(res, {
      text: result.text,
      pageCount: result.pageCount,
      charCount: result.charCount
    }, 'PDF text extracted successfully');
  } catch (err) {
    return errorResponse(res, err.message, 500, err);
  }
}

/**
 * Generate Study Notes
 */
async function generateNotes(req, res) {
  try {
    const { topic, subject = 'General', content = '', difficulty = 'intermediate', save = false } = req.body;
    if (!topic) {
      return errorResponse(res, 'Topic is required', 400);
    }

    const notes = await geminiService.generateStudyNotes({ topic, subject, content, difficulty });

    let savedNote = null;
    if (save && req.user) {
      const notePayload = {
        user_id: req.user.id,
        title: notes.title || `${topic} Notes`,
        subject,
        topic,
        original_content: content.substring(0, 5000),
        summary: notes.summary,
        structured_notes: notes.structured_notes || [],
        definitions: notes.definitions || [],
        key_points: notes.key_points || [],
        difficulty_level: difficulty,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (isConfigured && supabaseAdmin) {
        const { data, error } = await supabaseAdmin.from('notes').insert(notePayload).select().single();
        if (!error) savedNote = data;
      } else {
        const id = generateId();
        savedNote = { id, ...notePayload };
        localStore.notes.set(id, savedNote);
      }

      // Check for Knowledge Explorer achievement
      let count = 0;
      if (isConfigured && supabaseAdmin) {
        const { count: c } = await supabaseAdmin.from('notes').select('*', { count: 'exact', head: true }).eq('user_id', req.user.id);
        count = c || 1;
      } else {
        count = Array.from(localStore.notes.values()).filter(n => n.user_id === req.user.id).length;
      }
      await checkAndAwardAchievements(req.user.id, { notesCount: count });
    }

    return successResponse(res, {
      ...notes,
      saved: Boolean(savedNote),
      savedNoteId: savedNote ? savedNote.id : null
    }, 'Study notes generated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to generate study notes', 500, err);
  }
}

/**
 * Summarize Study Content
 */
async function summarize(req, res) {
  try {
    const { content, type = 'short', topic = '' } = req.body;
    if (!content && !topic) {
      return errorResponse(res, 'Content or topic is required for summarization', 400);
    }

    const summaryResult = await geminiService.generateSummary({ content, type, topic });
    return successResponse(res, summaryResult, 'Summary generated successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to generate summary', 500, err);
  }
}

/**
 * Simplify Difficult Concept
 */
async function simplifyConcept(req, res) {
  try {
    const { topic, concept, difficultyLevel = 'beginner', followUpQuestion = '' } = req.body;
    if (!topic && !concept) {
      return errorResponse(res, 'Topic or concept is required', 400);
    }

    const explanation = await geminiService.simplifyConcept({
      topic: topic || concept,
      concept: concept || topic,
      difficultyLevel,
      followUpQuestion
    });

    return successResponse(res, explanation, 'Concept simplified successfully');
  } catch (err) {
    return errorResponse(res, 'Failed to simplify concept', 500, err);
  }
}

/**
 * Chat with StudyAI Learning Assistant
 */
async function chat(req, res) {
  try {
    const userId = req.user.id;
    const { message, conversationId, subject = 'General', difficulty = 'intermediate' } = req.body;

    if (!message) {
      return errorResponse(res, 'Message text is required', 400);
    }

    let convId = conversationId;

    // Create conversation if not provided
    if (!convId) {
      const convTitle = message.substring(0, 40) + (message.length > 40 ? '...' : '');
      if (isConfigured && supabaseAdmin) {
        const { data: conv } = await supabaseAdmin.from('conversations').insert({
          user_id: userId,
          title: convTitle,
          subject
        }).select().single();
        if (conv) convId = conv.id;
      } else {
        convId = generateId();
        localStore.conversations.set(convId, {
          id: convId,
          user_id: userId,
          title: convTitle,
          subject,
          created_at: new Date().toISOString()
        });
      }
    }

    // Retrieve previous messages for context
    let history = [];
    if (convId) {
      if (isConfigured && supabaseAdmin) {
        const { data: msgs } = await supabaseAdmin
          .from('messages')
          .select('role, content')
          .eq('conversation_id', convId)
          .order('created_at', { ascending: true })
          .limit(10);
        history = msgs || [];
      } else {
        history = Array.from(localStore.messages.values())
          .filter(m => m.conversation_id === convId)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
          .slice(-10);
      }
    }

    // Call Gemini3.5 Flash Service
    const aiReply = await geminiService.chatAssistant({
      messages: history,
      userMessage: message,
      subject,
      difficulty
    });

    // Store user message & assistant message
    const userMsgObj = {
      conversation_id: convId,
      user_id: userId,
      role: 'user',
      content: message,
      difficulty_level: difficulty,
      created_at: new Date().toISOString()
    };

    const assistantMsgObj = {
      conversation_id: convId,
      user_id: userId,
      role: 'assistant',
      content: aiReply,
      difficulty_level: difficulty,
      created_at: new Date(Date.now() + 500).toISOString()
    };

    if (isConfigured && supabaseAdmin) {
      await supabaseAdmin.from('messages').insert([userMsgObj, assistantMsgObj]);
    } else {
      const uId = generateId();
      const aId = generateId();
      localStore.messages.set(uId, { id: uId, ...userMsgObj });
      localStore.messages.set(aId, { id: aId, ...assistantMsgObj });
    }

    return successResponse(res, {
      conversationId: convId,
      reply: aiReply,
      timestamp: new Date().toISOString()
    }, 'StudyAI response generated');
  } catch (err) {
    return errorResponse(res, 'Chat assistant error', 500, err);
  }
}

/**
 * List Saved Notes
 */
async function listNotes(req, res) {
  try {
    const userId = req.user.id;
    let notes = [];

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('notes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return errorResponse(res, 'Failed to fetch notes', 500, error);
      notes = data || [];
    } else {
      notes = Array.from(localStore.notes.values())
        .filter(n => n.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return successResponse(res, notes, 'Notes retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching notes', 500, err);
  }
}

/**
 * Save Note
 */
async function saveNote(req, res) {
  try {
    const userId = req.user.id;
    const { title, subject, topic, original_content, summary, structured_notes, definitions, key_points, difficulty_level } = req.body;

    const notePayload = {
      user_id: userId,
      title: title || `${topic} Notes`,
      subject: subject || 'General',
      topic: topic || 'General',
      original_content: (original_content || '').substring(0, 5000),
      summary: summary || '',
      structured_notes: structured_notes || [],
      definitions: definitions || [],
      key_points: key_points || [],
      difficulty_level: difficulty_level || 'intermediate',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    let result = null;
    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin.from('notes').insert(notePayload).select().single();
      if (error) return errorResponse(res, 'Failed to save note', 500, error);
      result = data;
    } else {
      const id = generateId();
      result = { id, ...notePayload };
      localStore.notes.set(id, result);
    }

    return successResponse(res, result, 'Note saved successfully', 201);
  } catch (err) {
    return errorResponse(res, 'Error saving note', 500, err);
  }
}

/**
 * Delete Note
 */
async function deleteNote(req, res) {
  try {
    const userId = req.user.id;
    const noteId = req.params.id;

    if (isConfigured && supabaseAdmin) {
      const { error } = await supabaseAdmin
        .from('notes')
        .delete()
        .eq('id', noteId)
        .eq('user_id', userId);

      if (error) return errorResponse(res, 'Failed to delete note', 500, error);
    } else {
      const note = localStore.notes.get(noteId);
      if (note && note.user_id === userId) {
        localStore.notes.delete(noteId);
      }
    }

    return successResponse(res, { id: noteId }, 'Note deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Error deleting note', 500, err);
  }
}

/**
 * List Conversations
 */
async function listConversations(req, res) {
  try {
    const userId = req.user.id;
    let convs = [];

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) return errorResponse(res, 'Failed to list conversations', 500, error);
      convs = data || [];
    } else {
      convs = Array.from(localStore.conversations.values())
        .filter(c => c.user_id === userId)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    return successResponse(res, convs, 'Conversations retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching conversations', 500, err);
  }
}

/**
 * Get Conversation Messages
 */
async function getConversationMessages(req, res) {
  try {
    const userId = req.user.id;
    const convId = req.params.id;
    let msgs = [];

    if (isConfigured && supabaseAdmin) {
      const { data, error } = await supabaseAdmin
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      if (error) return errorResponse(res, 'Failed to get messages', 500, error);
      msgs = data || [];
    } else {
      msgs = Array.from(localStore.messages.values())
        .filter(m => m.conversation_id === convId && m.user_id === userId)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return successResponse(res, msgs, 'Messages retrieved');
  } catch (err) {
    return errorResponse(res, 'Error fetching messages', 500, err);
  }
}

/**
 * Delete Conversation
 */
async function deleteConversation(req, res) {
  try {
    const userId = req.user.id;
    const convId = req.params.id;

    if (isConfigured && supabaseAdmin) {
      await supabaseAdmin.from('conversations').delete().eq('id', convId).eq('user_id', userId);
    } else {
      const conv = localStore.conversations.get(convId);
      if (conv && conv.user_id === userId) {
        localStore.conversations.delete(convId);
        for (const [mId, m] of localStore.messages.entries()) {
          if (m.conversation_id === convId) localStore.messages.delete(mId);
        }
      }
    }

    return successResponse(res, { id: convId }, 'Conversation deleted successfully');
  } catch (err) {
    return errorResponse(res, 'Error deleting conversation', 500, err);
  }
}

module.exports = {
  extractPdfText,
  generateNotes,
  summarize,
  simplifyConcept,
  chat,
  listNotes,
  saveNote,
  deleteNote,
  listConversations,
  getConversationMessages,
  deleteConversation
};

