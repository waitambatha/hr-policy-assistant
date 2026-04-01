/* =============================================================
   HR Policy Assistant — main.js
   ============================================================= */
'use strict';

// ── DOM Refs ─────────────────────────────────────────────────
const chatMessages   = document.getElementById('chatMessages');
const questionInput  = document.getElementById('questionInput');
const chatForm       = document.getElementById('chatForm');
const sendBtn        = document.querySelector('.send-btn');
const fileInput      = document.getElementById('fileInput');
const uploadForm     = document.getElementById('uploadForm');
const uploadArea     = document.querySelector('.upload-area');
const uploadProgress = document.querySelector('.upload-progress');
const progressFill   = document.querySelector('.progress-fill');
const progressLabel  = document.querySelector('.progress-label');
const menuBtn        = document.getElementById('menuBtn');
const menuDropdown   = document.getElementById('menuDropdown');
const themeBtn       = document.getElementById('themeBtn');
const themeBtnIcon   = document.getElementById('themeBtnIcon');
const typingRow      = document.getElementById('typingRow');
const welcomeText    = document.getElementById('welcomeText');
const welcomeCursor  = document.getElementById('welcomeCursor');

// ── Theme ─────────────────────────────────────────────────────
const THEME_KEY = 'hr-assistant-theme';
let isDark = (localStorage.getItem(THEME_KEY) === 'dark');

function applyTheme() {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  if (themeBtnIcon) themeBtnIcon.textContent = isDark ? '☀️' : '🌙';
}

if (themeBtn) {
  themeBtn.addEventListener('click', () => {
    isDark = !isDark;
    localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    applyTheme();
  });
}

applyTheme();

// ── Dropdown menu ──────────────────────────────────────────────
let menuOpen = false;

function openMenu()  { menuOpen = true;  menuDropdown && menuDropdown.classList.add('open'); }
function closeMenu() { menuOpen = false; menuDropdown && menuDropdown.classList.remove('open'); }

if (menuBtn) {
  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuOpen ? closeMenu() : openMenu();
  });
}
if (menuDropdown) {
  menuDropdown.addEventListener('click', (e) => e.stopPropagation());
}
document.addEventListener('click', closeMenu);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });

// Menu actions
window.clearConversation = function() {
  const msgs = [...chatMessages.children].filter(c => !c.classList.contains('welcome-wrap'));
  msgs.forEach(m => m.remove());
  closeMenu();
  showToast('✓ Conversation cleared');
};

window.copyLastAnswer = function() {
  const bubbles = chatMessages.querySelectorAll('.assistant-message .message-bubble');
  if (!bubbles.length) { showToast('No answer to copy yet'); return; }
  const last = bubbles[bubbles.length - 1];
  navigator.clipboard.writeText(last.innerText).then(() => showToast('✓ Copied to clipboard'));
  closeMenu();
};

// ── Typewriter ─────────────────────────────────────────────────
const WELCOME_TEXT = "Hello! I'm your HR Policy Assistant. Ask me anything about company policies, benefits, leave, or employment terms — I'll always cite the exact section and page.";

function typeWriter(el, text, cursorEl, onDone, speed = 26) {
  let i = 0;
  el.textContent = '';
  if (cursorEl) el.appendChild(cursorEl);

  function step() {
    if (i < text.length) {
      const node = document.createTextNode(text[i++]);
      el.insertBefore(node, cursorEl || null);
      setTimeout(step, speed + Math.random() * 10);
    } else {
      if (cursorEl) cursorEl.classList.add('done');
      if (onDone) onDone();
    }
  }
  step();
}

// Run welcome typewriter after animation delay
if (welcomeText && welcomeCursor) {
  setTimeout(() => {
    typeWriter(welcomeText, WELCOME_TEXT, welcomeCursor);
  }, 900);
}

// ── Utilities ─────────────────────────────────────────────────
function scrollToBottom(smooth = true) {
  if (!chatMessages) return;
  chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
}

function getCsrfToken() {
  const el = document.querySelector('[name=csrfmiddlewaretoken]');
  return el ? el.value : '';
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Toast
function showToast(message, type = 'info', duration = 2800) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Build & append a message bubble ───────────────────────────
function appendMessage(role, content, citations = [], useTypewriter = false) {
  const isUser = role === 'user';
  const time = formatTime();

  const wrap = document.createElement('div');
  wrap.className = `message ${isUser ? 'user' : 'assistant'}-message`;

  let citHtml = '';
  if (citations && citations.length) {
    citHtml = `<div class="citations">${citations.map(c =>
      `<div class="citation"><span>📌</span><span>${escapeHtml(c.section)} — ${escapeHtml(c.document)}, Page ${c.page}</span></div>`
    ).join('')}</div>`;
  }

  wrap.innerHTML = `
    <div class="message-meta">
      <div class="message-avatar">${isUser ? '👤' : '📋'}</div>
      <span>${isUser ? 'You' : 'HR Assistant'}</span>
      <span class="message-time">${time}</span>
    </div>
    <div class="message-bubble">
      ${isUser ? escapeHtml(content).replace(/\n/g, '<br>') : ''}
      ${!isUser ? citHtml : ''}
    </div>`;

  chatMessages.appendChild(wrap);

  // Typewriter for AI responses
  if (!isUser && useTypewriter) {
    const bubble = wrap.querySelector('.message-bubble');
    const textSpan = document.createElement('span');
    const cit = bubble.querySelector('.citations');
    if (cit) bubble.insertBefore(textSpan, cit);
    else bubble.appendChild(textSpan);

    const cur = document.createElement('span');
    cur.className = 'tw-cursor';
    textSpan.appendChild(cur);

    typeWriter(textSpan, content, cur, () => scrollToBottom(), 20);
  }

  scrollToBottom();
  return wrap;
}

// ── Typing indicator ───────────────────────────────────────────
function setTyping(show) {
  if (!typingRow) return;
  typingRow.classList.toggle('active', show);
  if (show) scrollToBottom();
}

// ── Loading state ─────────────────────────────────────────────
function setSending(loading) {
  if (sendBtn) sendBtn.classList.toggle('loading', loading);
  if (sendBtn) sendBtn.disabled = loading;
  if (questionInput) questionInput.disabled = loading;
  if (!loading && questionInput) questionInput.focus();
}

// ── Send message ───────────────────────────────────────────────
async function sendMessage(event) {
  if (event) event.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;

  appendMessage('user', question);
  questionInput.value = '';
  setSending(true);
  setTyping(true);

  try {
    const response = await fetch(chatForm.action || window.location.pathname, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': getCsrfToken(),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: new URLSearchParams({ question }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();

    setTyping(false);
    const answer = data.answer || data.response || data.content || '';
    appendMessage('assistant', answer, data.citations || [], true);

  } catch (err) {
    setTyping(false);
    const errWrap = document.createElement('div');
    errWrap.className = 'message assistant-message';
    errWrap.innerHTML = `
      <div class="message-meta">
        <div class="message-avatar">📋</div><span>HR Assistant</span>
      </div>
      <div class="error-bubble"><span>⚠</span><span>Something went wrong. Please try again.</span></div>`;
    chatMessages.appendChild(errWrap);
    scrollToBottom();
    console.error('[HR Assistant]', err);
  } finally {
    setSending(false);
  }
}

// Public shortcut for quick pills
window.askQuestion = function(text) {
  if (questionInput) { questionInput.value = text; }
  sendMessage(null);
};

// ── File upload ────────────────────────────────────────────────
if (uploadArea) {
  uploadArea.addEventListener('dragover',  (e) => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
  uploadArea.addEventListener('dragleave', ()  => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('dragend',   ()  => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      handleFileUpload(file);
    } else {
      showToast('Please drop a PDF file.', 'error');
    }
  });
}

if (fileInput) {
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFileUpload(fileInput.files[0]);
  });
}

async function handleFileUpload(file) {
  if (!file) return;
  if (uploadProgress) { uploadProgress.classList.add('active'); animateProgress(0, 65, 900); }

  const formData = new FormData();
  formData.append('document', file);
  formData.append('csrfmiddlewaretoken', getCsrfToken());

  try {
    const action = uploadForm ? uploadForm.action : '/upload/';
    const response = await fetch(action, { method: 'POST', body: formData });
    animateProgress(65, 100, 400);
    await new Promise(r => setTimeout(r, 500));

    if (response.ok) {
      showToast(`"${file.name}" uploaded successfully.`, 'success');
      setTimeout(() => window.location.reload(), 800);
    } else {
      throw new Error('Upload failed');
    }
  } catch (err) {
    showToast('Upload failed. Please try again.', 'error');
    if (uploadProgress) uploadProgress.classList.remove('active');
    if (progressFill)   progressFill.style.width = '0%';
  }
}

function animateProgress(from, to, duration) {
  if (!progressFill || !progressLabel) return;
  const start = performance.now();
  (function step(now) {
    const p = Math.min((now - start) / duration, 1);
    const v = Math.round(from + (to - from) * p);
    progressFill.style.width = v + '%';
    progressLabel.textContent = v < 100 ? `Uploading… ${v}%` : 'Processing…';
    if (p < 1) requestAnimationFrame(step);
  })(performance.now());
}

// ── Tab switching ──────────────────────────────────────────────
window.showDocuments = function() {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === 1));
};
window.showChat = function() {
  document.querySelectorAll('.tab').forEach((t, i) => t.classList.toggle('active', i === 0));
};

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  scrollToBottom(false);
  if (questionInput) questionInput.focus();

  const tabs = document.querySelectorAll('.tab');
  if (tabs[0]) tabs[0].addEventListener('click', showChat);
  if (tabs[1]) tabs[1].addEventListener('click', showDocuments);
});

if (questionInput) {
  questionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); }
  });
}
