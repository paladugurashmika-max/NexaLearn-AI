/**
 * NexaLearn AI - Study Studio Controller
 */

let currentGeneratedNotes = null;
let allSavedNotes = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!checkAuthProtection()) return;

  if (window.lucide) window.lucide.createIcons();

  // Parse URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const topicParam = urlParams.get('topic');
  const tabParam = urlParams.get('tab');
  const levelParam = urlParams.get('level');

  if (topicParam) {
    const topicInput = document.getElementById('notes-topic');
    if (topicInput) topicInput.value = topicParam;
    const simplifierTopic = document.getElementById('simplifier-topic');
    if (simplifierTopic) simplifierTopic.value = topicParam;
  }

  if (levelParam) {
    const levelSelect = document.getElementById('simplifier-level');
    if (levelSelect) levelSelect.value = levelParam;
  }

  if (tabParam === 'simplifier') {
    const btn = document.querySelector('[data-tab="simplifier-tab"]');
    if (btn) switchStudioTab('simplifier-tab', btn);
  } else if (tabParam === 'summary') {
    const btn = document.querySelector('[data-tab="summary-tab"]');
    if (btn) switchStudioTab('summary-tab', btn);
  }

  await loadSavedNotes();

  // Attach form listeners
  setupFormListeners();
});

function switchStudioTab(tabId, btnElement) {
  document.querySelectorAll('.studio-tab-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

  const activeContent = document.getElementById(tabId);
  if (activeContent) activeContent.style.display = 'block';

  if (btnElement) btnElement.classList.add('active');
  if (window.lucide) window.lucide.createIcons();
}

function setupFormListeners() {
  // 1. Notes Form
  const notesForm = document.getElementById('notes-form');
  if (notesForm) {
    notesForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const topic = document.getElementById('notes-topic').value.trim();
      const subject = document.getElementById('notes-subject').value.trim();
      const difficulty = document.getElementById('notes-depth').value;
      const content = document.getElementById('notes-content').value.trim();

      const btn = document.getElementById('generate-notes-btn');
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader"></i> <span>Synthesizing notes with Gemini...</span>';
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetchWithAuth('/ai/notes', {
          method: 'POST',
          body: JSON.stringify({ topic, subject, difficulty, content })
        });

        if (res.success && res.data) {
          currentGeneratedNotes = { ...res.data, topic, subject, difficulty };
          renderGeneratedNotes(res.data);
          showToast('Notes generated successfully!', 'success');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i> <span>Generate Structured Notes</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // 2. Summary Form
  const summaryForm = document.getElementById('summary-form');
  if (summaryForm) {
    summaryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const topic = document.getElementById('summary-topic').value.trim();
      const type = document.getElementById('summary-type').value;
      const content = document.getElementById('summary-content').value.trim();

      const btn = document.getElementById('generate-summary-btn');
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader"></i> <span>Synthesizing summary...</span>';
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetchWithAuth('/ai/summarize', {
          method: 'POST',
          body: JSON.stringify({ topic, type, content })
        });

        if (res.success && res.data) {
          renderSummary(res.data);
          showToast('Summary synthesized!', 'success');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="sparkles"></i> <span>Generate Summary</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }

  // 3. Simplifier Form
  const simplifierForm = document.getElementById('simplifier-form');
  if (simplifierForm) {
    simplifierForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const topic = document.getElementById('simplifier-topic').value.trim();
      const difficultyLevel = document.getElementById('simplifier-level').value;
      const followUpQuestion = document.getElementById('simplifier-question').value.trim();

      const btn = document.getElementById('simplify-btn');
      btn.disabled = true;
      btn.innerHTML = '<i data-lucide="loader"></i> <span>Analyzing & simplifying...</span>';
      if (window.lucide) window.lucide.createIcons();

      try {
        const res = await fetchWithAuth('/ai/explain', {
          method: 'POST',
          body: JSON.stringify({ topic, concept: topic, difficultyLevel, followUpQuestion })
        });

        if (res.success && res.data) {
          renderSimplifiedConcept(res.data, topic);
          showToast('Concept simplified successfully!', 'success');
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="lightbulb"></i> <span>Simplify Concept</span>';
        if (window.lucide) window.lucide.createIcons();
      }
    });
  }
}

/**
 * Handle PDF File Extraction
 */
async function extractPdf() {
  const fileInput = document.getElementById('pdf-file-input');
  const statusDiv = document.getElementById('pdf-status');

  if (!fileInput.files || fileInput.files.length === 0) {
    showToast('Please select a PDF file first', 'error');
    return;
  }

  const file = fileInput.files[0];
  if (file.type !== 'application/pdf') {
    showToast('Only PDF documents are supported', 'error');
    return;
  }

  statusDiv.innerHTML = '<span style="color: var(--primary-light);">Parsing PDF text on server...</span>';
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetchWithAuth('/ai/extract-pdf', {
      method: 'POST',
      body: formData
    });

    if (res.requiresOCR) {
      statusDiv.innerHTML = `<span style="color: #f87171;">⚠️ ${res.message}</span>`;
      showToast('Scanned image PDF detected. Text extraction requires OCR.', 'error');
      return;
    }

    if (res.success && res.data?.text) {
      document.getElementById('notes-content').value = res.data.text;
      statusDiv.innerHTML = `<span style="color: #34d399;">✓ Extracted ${res.data.charCount} characters across ${res.data.pageCount} page(s).</span>`;
      showToast('PDF text extracted into content area!', 'success');
    }
  } catch (err) {
    statusDiv.innerHTML = `<span style="color: #f87171;">Extraction failed: ${err.message}</span>`;
  }
}

/**
 * Render Generated Notes
 */
function renderGeneratedNotes(notes) {
  const output = document.getElementById('notes-output-area');
  const saveBtn = document.getElementById('save-note-btn');
  saveBtn.style.display = 'inline-flex';

  let sectionsHtml = (notes.structured_notes || []).map(sec => `
    <div style="margin-bottom: 1.25rem; padding: 1rem; background: var(--bg-surface); border-radius: var(--radius-md); border-left: 3px solid var(--primary-light);">
      <h4 style="margin-bottom: 0.5rem; color: #fff;">${sec.section_title}</h4>
      <div style="font-size: 0.925rem; color: var(--text-muted); line-height: 1.6; white-space: pre-wrap;">${sec.content}</div>
      ${sec.key_takeaway ? `<div style="margin-top: 0.5rem; font-size: 0.825rem; color: var(--primary-light); font-weight: 500;">💡 Takeaway: ${sec.key_takeaway}</div>` : ''}
    </div>
  `).join('');

  let defsHtml = (notes.definitions || []).map(def => `
    <div style="padding: 0.75rem; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--border-color); border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
      <span style="font-weight: 700; color: #fff;">${def.term}:</span>
      <span style="font-size: 0.9rem; color: var(--text-muted); margin-left: 0.25rem;">${def.definition}</span>
    </div>
  `).join('');

  let keyPointsHtml = (notes.key_points || []).map(pt => `
    <li style="margin-bottom: 0.4rem; font-size: 0.9rem; color: var(--text-muted);">${pt}</li>
  `).join('');

  output.innerHTML = `
    <div style="margin-bottom: 1.5rem;">
      <h2 style="font-size: 1.4rem; margin-bottom: 0.5rem; color: #fff;">${notes.title || 'Structured Study Notes'}</h2>
      <p style="font-size: 0.95rem; line-height: 1.6; color: var(--text-muted); padding: 0.85rem; background: rgba(139, 92, 246, 0.05); border-radius: var(--radius-md); border: 1px solid rgba(139, 92, 246, 0.2);">
        ${notes.summary}
      </p>
    </div>

    <div style="margin-bottom: 1.5rem;">
      <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Structured Topic Breakdown</h3>
      ${sectionsHtml}
    </div>

    ${notes.definitions && notes.definitions.length > 0 ? `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Key Academic Definitions</h3>
        ${defsHtml}
      </div>
    ` : ''}

    ${notes.key_points && notes.key_points.length > 0 ? `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Key Takeaway Bullet Points</h3>
        <ul style="padding-left: 1.25rem;">${keyPointsHtml}</ul>
      </div>
    ` : ''}

    <div style="margin-top: 1.5rem; display: flex; gap: 0.75rem; flex-wrap: wrap;">
      <a href="quiz.html?autoTopic=${encodeURIComponent(currentGeneratedNotes.topic || '')}" class="btn btn-primary btn-sm">
        <i data-lucide="check-square"></i>
        <span>Take Quiz on this Topic</span>
      </a>
      <a href="flashcards.html?topic=${encodeURIComponent(currentGeneratedNotes.topic || '')}" class="btn btn-secondary btn-sm">
        <i data-lucide="layers"></i>
        <span>Generate Flashcards</span>
      </a>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Save Current Generated Note to DB
 */
async function saveCurrentNote() {
  if (!currentGeneratedNotes) return;

  try {
    const res = await fetchWithAuth('/ai/notes/save', {
      method: 'POST',
      body: JSON.stringify({
        title: currentGeneratedNotes.title,
        subject: currentGeneratedNotes.subject || 'General',
        topic: currentGeneratedNotes.topic,
        summary: currentGeneratedNotes.summary,
        structured_notes: currentGeneratedNotes.structured_notes,
        definitions: currentGeneratedNotes.definitions,
        key_points: currentGeneratedNotes.key_points,
        difficulty_level: currentGeneratedNotes.difficulty
      })
    });

    if (res.success) {
      showToast('Note saved to personal library! +20 XP', 'success');
      document.getElementById('save-note-btn').innerText = 'Saved ✓';
      await loadSavedNotes();
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/**
 * Render Summary
 */
function renderSummary(data) {
  const output = document.getElementById('summary-output-area');
  const highlights = (data.key_highlights || []).map(h => `<li style="margin-bottom: 0.35rem;">${h}</li>`).join('');

  output.innerHTML = `
    <div style="padding: 1.25rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
      <div class="badge badge-primary" style="margin-bottom: 0.75rem;">${data.type.toUpperCase()} SUMMARY</div>
      <div style="font-size: 0.95rem; line-height: 1.6; white-space: pre-wrap; margin-bottom: 1.25rem; color: #fff;">${data.summary}</div>

      ${highlights ? `
        <h4 style="margin-bottom: 0.5rem; color: var(--primary-light);">Key Highlights:</h4>
        <ul style="padding-left: 1.25rem; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem;">${highlights}</ul>
      ` : ''}

      ${data.exam_tips ? `
        <div style="padding: 0.75rem; background: rgba(245, 158, 11, 0.1); border-left: 3px solid var(--warning); border-radius: var(--radius-sm); font-size: 0.85rem; color: #fbbf24;">
          🎯 Exam Tip: ${data.exam_tips}
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Render Simplified Concept
 */
function renderSimplifiedConcept(data, topic) {
  const output = document.getElementById('simplifier-output-area');
  const steps = (data.step_by_step || []).map(s => `<li style="margin-bottom: 0.4rem;">${s}</li>`).join('');
  const pitfalls = (data.common_pitfalls || []).map(p => `<li style="margin-bottom: 0.4rem;">${p}</li>`).join('');

  output.innerHTML = `
    <div style="padding: 1.25rem; background: var(--bg-surface); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
      <div class="badge badge-primary" style="margin-bottom: 0.75rem;">${data.level.toUpperCase()} LEVEL</div>

      <div style="font-size: 1rem; line-height: 1.6; margin-bottom: 1.25rem; color: #fff; white-space: pre-wrap;">
        ${data.simple_explanation}
      </div>

      ${data.analogy ? `
        <div style="padding: 1rem; background: rgba(139, 92, 246, 0.1); border-left: 3px solid var(--primary-light); border-radius: var(--radius-sm); margin-bottom: 1.25rem;">
          <h4 style="color: var(--primary-light); margin-bottom: 0.35rem;">💡 Everyday Analogy:</h4>
          <p style="font-size: 0.9rem; color: var(--text-main);">${data.analogy}</p>
        </div>
      ` : ''}

      ${steps ? `
        <h4 style="margin-bottom: 0.5rem; color: #fff;">Step-by-Step Logic:</h4>
        <ol style="padding-left: 1.25rem; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.25rem;">${steps}</ol>
      ` : ''}

      ${pitfalls ? `
        <h4 style="margin-bottom: 0.5rem; color: #f87171;">Common Student Misconceptions:</h4>
        <ul style="padding-left: 1.25rem; font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.25rem;">${pitfalls}</ul>
      ` : ''}

      ${data.follow_up_answer ? `
        <div style="padding: 0.85rem; background: rgba(16, 185, 129, 0.1); border-left: 3px solid var(--success); border-radius: var(--radius-sm); margin-bottom: 1rem;">
          <h4 style="color: #34d399; margin-bottom: 0.25rem;">Answer to Your Question:</h4>
          <p style="font-size: 0.9rem; color: var(--text-main);">${data.follow_up_answer}</p>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Load Saved Notes Library
 */
async function loadSavedNotes() {
  const grid = document.getElementById('saved-notes-grid');
  try {
    const res = await fetchWithAuth('/ai/notes');
    if (!res.success) return;

    allSavedNotes = res.data || [];
    renderSavedNotesGrid(allSavedNotes);
  } catch (err) {
    console.warn('Failed to load saved notes:', err);
  }
}

function renderSavedNotesGrid(notes) {
  const grid = document.getElementById('saved-notes-grid');
  if (!notes || notes.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <div class="empty-icon"><i data-lucide="inbox"></i></div>
        <div class="empty-title">No Saved Notes Yet</div>
        <div class="empty-desc">Generate notes using the form above and click "Save to Library".</div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  grid.innerHTML = notes.map(note => `
    <div class="card" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
          <span class="badge badge-primary" style="font-size: 0.65rem;">${note.subject || 'General'}</span>
          <button onclick="deleteSavedNote('${note.id}')" title="Delete note" class="close-btn" style="color: var(--danger);">
            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
          </button>
        </div>
        <h4 style="margin-bottom: 0.5rem; color: #fff;">${note.title || note.topic}</h4>
        <p style="font-size: 0.85rem; color: var(--text-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
          ${note.summary || 'Click to view structured notes.'}
        </p>
      </div>

      <div style="margin-top: 1rem; pt-top: 0.75rem; border-top: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 0.75rem; color: var(--text-dim);">${formatDate(note.created_at)}</span>
        <button onclick="viewSavedNote('${note.id}')" class="btn btn-secondary btn-sm">View</button>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

function viewSavedNote(noteId) {
  const note = allSavedNotes.find(n => n.id === noteId);
  if (!note) return;

  switchStudioTab('notes-tab', document.querySelector('[data-tab="notes-tab"]'));
  currentGeneratedNotes = note;
  renderGeneratedNotes(note);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function deleteSavedNote(noteId) {
  if (!confirm('Are you sure you want to delete this study note?')) return;

  try {
    await fetchWithAuth(`/ai/notes/${noteId}`, { method: 'DELETE' });
    showToast('Note deleted', 'info');
    await loadSavedNotes();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

function filterNotes(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderSavedNotesGrid(allSavedNotes);
    return;
  }
  const filtered = allSavedNotes.filter(n =>
    (n.title && n.title.toLowerCase().includes(q)) ||
    (n.topic && n.topic.toLowerCase().includes(q)) ||
    (n.subject && n.subject.toLowerCase().includes(q))
  );
  renderSavedNotesGrid(filtered);
}

window.switchStudioTab = switchStudioTab;
window.extractPdf = extractPdf;
window.saveCurrentNote = saveCurrentNote;
window.viewSavedNote = viewSavedNote;
window.deleteSavedNote = deleteSavedNote;
window.filterNotes = filterNotes;

