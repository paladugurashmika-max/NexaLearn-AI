/**
 * NexaLearn AI - AI Flashcards Controller
 */

let cardDeck = [];
let currentCardIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthProtection()) return;

  if (window.lucide) window.lucide.createIcons();

  const urlParams = new URLSearchParams(window.location.search);
  const topicParam = urlParams.get('topic');

  await loadFlashcards(topicParam);

  if (topicParam && cardDeck.length === 0) {
    document.getElementById('card-gen-topic').value = topicParam;
    openCreateModal();
  }

  // Setup form listener
  const form = document.getElementById('generate-cards-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const topic = document.getElementById('card-gen-topic').value.trim();
      const subject = document.getElementById('card-gen-subject').value.trim();
      const count = document.getElementById('card-gen-count').value;
      const content = document.getElementById('card-gen-content').value.trim();

      const btn = document.getElementById('card-submit-btn');
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader"></i> <span>Formulating flashcards with Gemini...</span>';
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetchWithAuth('/flashcards/generate', {
          method: 'POST',
          body: JSON.stringify({ topic, subject, count, content })
        });

        if (res.success && res.data) {
          closeCreateModal();
          showToast('Flashcard deck generated successfully!', 'success');
          await loadFlashcards(topic);
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i> <span>Generate Deck with Gemini3.5 Flash AI</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
});

function openCreateModal() {
  document.getElementById('generate-cards-modal').classList.add('active');
}

function closeCreateModal() {
  document.getElementById('generate-cards-modal').classList.remove('active');
}

async function loadFlashcards(topicFilter = null) {
  try {
    const endpoint = topicFilter ? `/flashcards?topic=${encodeURIComponent(topicFilter)}` : '/flashcards';
    const res = await fetchWithAuth(endpoint);
    if (!res.success) return;

    cardDeck = res.data || [];
    currentCardIndex = 0;

    renderActiveCard();
    renderAllCardsGrid();
  } catch (err) {
    console.warn('Failed to load flashcards:', err);
  }
}

function renderActiveCard() {
  const cardWrapper = document.getElementById('flashcard-element');
  cardWrapper.classList.remove('flipped'); // Reset flip on change

  if (!cardDeck || cardDeck.length === 0) {
    document.getElementById('card-front-text').innerText = 'No flashcards in deck. Click "Generate Flashcard Deck" to create one!';
    document.getElementById('card-back-text').innerText = 'Click "Generate Flashcard Deck" to begin spaced practice.';
    document.getElementById('card-counter').innerText = '0 of 0';
    document.getElementById('prev-card-btn').disabled = true;
    document.getElementById('next-card-btn').disabled = true;
    return;
  }

  const card = cardDeck[currentCardIndex];
  document.getElementById('card-topic-badge').innerText = card.topic || 'General';
  document.getElementById('card-counter').innerText = `Card ${currentCardIndex + 1} of ${cardDeck.length}`;
  document.getElementById('card-front-text').innerText = card.front;
  document.getElementById('card-back-text').innerText = card.back;

  const masteryBadge = document.getElementById('card-mastery-badge');
  masteryBadge.innerText = (card.mastery_level || 'learning').toUpperCase();
  masteryBadge.className = `badge ${card.mastery_level === 'mastered' ? 'badge-strong' : 'badge-moderate'}`;

  document.getElementById('prev-card-btn').disabled = currentCardIndex === 0;
  document.getElementById('next-card-btn').disabled = currentCardIndex === cardDeck.length - 1;
}

function flipCard() {
  const cardWrapper = document.getElementById('flashcard-element');
  cardWrapper.classList.toggle('flipped');
}

function prevCard() {
  if (currentCardIndex > 0) {
    currentCardIndex -= 1;
    renderActiveCard();
  }
}

function nextCard() {
  if (currentCardIndex < cardDeck.length - 1) {
    currentCardIndex += 1;
    renderActiveCard();
  }
}

async function markCurrentCardMastery(masteryLevel) {
  if (!cardDeck || cardDeck.length === 0) return;
  const card = cardDeck[currentCardIndex];

  try {
    const res = await fetchWithAuth(`/flashcards/${card.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ mastery_level: masteryLevel })
    });

    if (res.success) {
      card.mastery_level = masteryLevel;
      renderActiveCard();
      renderAllCardsGrid();
      showToast(masteryLevel === 'mastered' ? 'Marked as Mastered! 🎉' : 'Marked for review', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function renderAllCardsGrid() {
  const grid = document.getElementById('flashcards-grid');
  if (!cardDeck || cardDeck.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon"><i data-lucide="layers"></i></div>
        <div class="empty-title">Deck is empty</div>
        <div class="empty-desc">Generate flashcards from your study topics to review them here.</div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  grid.innerHTML = cardDeck.map((c, idx) => `
    <div class="card" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between; border-color: ${c.mastery_level === 'mastered' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-color)'};">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <span class="badge ${c.mastery_level === 'mastered' ? 'badge-strong' : 'badge-moderate'}" style="font-size: 0.65rem;">
            ${(c.mastery_level || 'learning').toUpperCase()}
          </span>
          <button onclick="deleteCard('${c.id}')" title="Delete card" class="close-btn" style="color: var(--danger);">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
        <h4 style="margin-bottom: 0.5rem; font-size: 0.95rem; color: #fff;">${c.front}</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${c.back}
        </p>
      </div>

      <div style="margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.75rem; color: var(--text-dim);">${c.topic}</span>
        <button onclick="jumpToCard(${idx})" class="btn btn-secondary btn-sm">Review</button>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function jumpToCard(index) {
  currentCardIndex = index;
  renderActiveCard();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteCard(cardId) {
  if (!confirm('Delete this flashcard?')) return;
  try {
    await fetchWithAuth(`/flashcards/${cardId}`, { method: 'DELETE' });
    cardDeck = cardDeck.filter(c => c.id !== cardId);
    if (currentCardIndex >= cardDeck.length) {
      currentCardIndex = Math.max(0, cardDeck.length - 1);
    }
    renderActiveCard();
    renderAllCardsGrid();
    showToast('Card deleted', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

window.openCreateModal = openCreateModal;
window.closeCreateModal = closeCreateModal;
window.flipCard = flipCard;
window.prevCard = prevCard;
window.nextCard = nextCard;
window.markCurrentCardMastery = markCurrentCardMastery;
window.jumpToCard = jumpToCard;
window.deleteCard = deleteCard;

