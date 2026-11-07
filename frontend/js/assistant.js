/**
 * NexaLearn AI - StudyAI Learning Assistant Controller
 */

let activeConversationId = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthProtection()) return;

  if (window.lucide) window.lucide.createIcons();

  await loadConversations();

  // Check URL query param
  const urlParams = new URLSearchParams(window.location.search);
  const queryParam = urlParams.get('query');
  if (queryParam) {
    document.getElementById('chat-input').value = queryParam;
    sendMessage(queryParam);
  }

  // Setup form submit listener
  const form = document.getElementById('chat-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('chat-input');
      const msg = input.value.trim();
      if (!msg) return;
      input.value = '';
      sendMessage(msg);
    });
  }
});

async function loadConversations() {
  const container = document.getElementById('conversations-list');
  try {
    const res = await fetchWithAuth('/ai/conversations');
    if (!res.success) return;

    const convs = res.data || [];
    if (convs.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem 0.5rem;">
          <div class="empty-icon" style="width: 40px; height: 40px;"><i data-lucide="message-square"></i></div>
          <div class="empty-title" style="font-size: 0.85rem;">No conversations yet</div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    container.innerHTML = convs.map(c => `
      <div class="conv-item ${c.id === activeConversationId ? 'active' : ''}" onclick="selectConversation('${c.id}')" style="display: flex; justify-content: space-between; align-items: center; padding: 0.65rem 0.75rem; border-radius: var(--radius-sm); background: ${c.id === activeConversationId ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)'}; border: 1px solid ${c.id === activeConversationId ? 'var(--primary)' : 'var(--border-color)'}; cursor: pointer;">
        <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.85rem; color: #fff;">
          ${c.title || 'Conversation'}
        </div>
        <button onclick="event.stopPropagation(); deleteConversation('${c.id}')" class="close-btn" style="color: var(--text-dim); padding: 2px;">
          <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
        </button>
      </div>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    console.warn('Failed to load conversations:', err);
  }
}

async function selectConversation(convId) {
  activeConversationId = convId;
  await loadConversations();

  const container = document.getElementById('messages-container');
  container.innerHTML = '<div style="text-align: center; color: var(--text-dim); padding: 2rem;">Loading messages...</div>';

  try {
    const res = await fetchWithAuth(`/ai/conversations/${convId}/messages`);
    if (!res.success) return;

    const msgs = res.data || [];
    if (msgs.length === 0) {
      container.innerHTML = `
        <div class="message-bubble message-assistant">
          <div style="font-weight: 700; color: var(--primary-light); margin-bottom: 0.35rem;">StudyAI Tutor</div>
          <div>How can I help you with this topic?</div>
        </div>
      `;
    } else {
      container.innerHTML = msgs.map(m => `
        <div class="message-bubble ${m.role === 'user' ? 'message-user' : 'message-assistant'}">
          ${m.role === 'assistant' ? '<div style="font-weight: 700; color: var(--primary-light); margin-bottom: 0.35rem;">StudyAI Tutor</div>' : ''}
          <div>${formatMessageMarkdown(m.content)}</div>
        </div>
      `).join('');
    }

    container.scrollTop = container.scrollHeight;
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function createNewConversation() {
  activeConversationId = null;
  const container = document.getElementById('messages-container');
  container.innerHTML = `
    <div class="message-bubble message-assistant">
      <div style="font-weight: 700; color: var(--primary-light); margin-bottom: 0.35rem; display: flex; align-items: center; gap: 0.4rem;">
        <i data-lucide="bot" style="width: 16px; height: 16px;"></i>
        <span>StudyAI Tutor</span>
      </div>
      <div>
        Hello! I'm your dedicated AI academic tutor. What concept, formula, or coding problem can I help you master today?
      </div>
    </div>
  `;
  loadConversations();
  if (window.lucide) window.lucide.createIcons();
}

async function deleteConversation(convId) {
  if (!confirm('Delete this conversation?')) return;
  try {
    await fetchWithAuth(`/ai/conversations/${convId}`, { method: 'DELETE' });
    if (activeConversationId === convId) {
      createNewConversation();
    }
    await loadConversations();
    showToast('Conversation deleted', 'info');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function sendMessage(messageText) {
  const container = document.getElementById('messages-container');
  const difficulty = document.getElementById('chat-difficulty').value;
  const sendBtn = document.getElementById('send-btn');

  // Append user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'message-bubble message-user';
  userBubble.innerText = messageText;
  container.appendChild(userBubble);

  // Append typing assistant bubble
  const aiBubble = document.createElement('div');
  aiBubble.className = 'message-bubble message-assistant';
  aiBubble.innerHTML = `
    <div style="font-weight: 700; color: var(--primary-light); margin-bottom: 0.35rem;">StudyAI Tutor</div>
    <div style="color: var(--text-dim); font-style: italic;">Thinking & formulating step-by-step reasoning...</div>
  `;
  container.appendChild(aiBubble);
  container.scrollTop = container.scrollHeight;

  sendBtn.disabled = true;

  try {
    const res = await fetchWithAuth('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: messageText,
        conversationId: activeConversationId,
        difficulty
      })
    });

    if (res.success && res.data) {
      if (!activeConversationId && res.data.conversationId) {
        activeConversationId = res.data.conversationId;
        await loadConversations();
      }

      aiBubble.innerHTML = `
        <div style="font-weight: 700; color: var(--primary-light); margin-bottom: 0.35rem;">StudyAI Tutor</div>
        <div>${formatMessageMarkdown(res.data.reply)}</div>
      `;
      container.scrollTop = container.scrollHeight;
    }
  } catch (err) {
    aiBubble.innerHTML = `<span style="color: #f87171;">Error: ${err.message}</span>`;
  } finally {
    sendBtn.disabled = false;
  }
}

/**
 * Basic markdown formatter for AI assistant responses
 */
function formatMessageMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/```([\s\S]*?)```/g, '<pre style="background: rgba(0,0,0,0.4); padding: 0.85rem; border-radius: 8px; margin: 0.5rem 0; overflow-x: auto;"><code>$1</code></pre>')
    .replace(/`([^`]+)`/g, '<code style="background: rgba(255,255,255,0.1); padding: 2px 5px; border-radius: 4px;">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

window.createNewConversation = createNewConversation;
window.selectConversation = selectConversation;
window.deleteConversation = deleteConversation;

