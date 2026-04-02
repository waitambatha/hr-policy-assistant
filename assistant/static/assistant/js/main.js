'use strict';

// ── State ──────────────────────────────────────────────
let currentChatId   = null;
let currentDocId    = null;
let currentDocTitle = null;
let availableDocs   = [];
let pendingQuestion = null;
let currentProvider = 'huggingface';
let isSending       = false;

// ── DOM helper ─────────────────────────────────────────
const $  = id => document.getElementById(id);

// ── Cookie ─────────────────────────────────────────────
function getCookie(name) {
    for (const c of document.cookie.split(';')) {
        const [k, v] = c.trim().split('=');
        if (k === name) return decodeURIComponent(v);
    }
    return null;
}

// ── Loading overlay ────────────────────────────────────
function showLoading(msg = 'Loading…') {
    $('loadingText').textContent = msg;
    $('loadingOverlay').classList.add('active');
}
function hideLoading() {
    $('loadingOverlay').classList.remove('active');
}

// ── Toast notifications ────────────────────────────────
function showToast(message, type = 'info', title = '') {
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || icons.info}</div>
        <div class="toast-body">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-msg">${message}</div>
        </div>
        <button class="toast-close">×</button>
    `;
    toast.querySelector('.toast-close').onclick = () => dismissToast(toast);
    $('toastContainer').appendChild(toast);
    setTimeout(() => dismissToast(toast), 5000);
}
function dismissToast(toast) {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
}

// ── Modal helpers ──────────────────────────────────────
function openModal(id)  { $(id).classList.add('active'); }
function closeModal(id) { $(id).classList.remove('active'); }

// Close any modal when clicking outside its box
document.addEventListener('click', e => {
    if (e.target.classList.contains('modal-overlay')) {
        const id = e.target.id;
        closeModal(id);
        if (id === 'docSelectorModal') pendingQuestion = null;
    }
});

// ── Sidebar toggle ─────────────────────────────────────
$('hamburgerBtn').addEventListener('click', () => {
    $('sidebar').classList.toggle('expanded');
});

// ── Nav buttons ────────────────────────────────────────
$('newChatBtn').addEventListener('click', startNewChat);

$('docsBtn').addEventListener('click', () => {
    populateDocumentsModal();
    openModal('documentsModal');
});

$('uploadBtn').addEventListener('click', () => openModal('uploadModal'));

$('settingsBtn').addEventListener('click', () => {
    window.location.href = '/settings/';
});

$('signoutBtn').addEventListener('click', () => {
    window.location.href = '/logout/';
});

// ── Document indicator & input lock ───────────────────
function updateDocIndicator() {
    const ind   = $('docIndicator');
    const text  = $('docIndicatorText');
    const input = $('questionInput');
    const btn   = $('sendBtn');

    if (currentDocId && currentDocTitle) {
        ind.classList.remove('empty');
        text.textContent = currentDocTitle;
        input.disabled = false;
        input.placeholder = 'Ask about HR policies…';
        btn.disabled = false;
    } else {
        ind.classList.add('empty');
        text.textContent = 'Select a document to start';
        input.disabled = true;
        input.placeholder = 'Select a document above to start chatting…';
        btn.disabled = true;
    }
}

$('docIndicator').addEventListener('click', () => {
    if (availableDocs.length) showDocSelectorModal(null);
});

// ── New chat ───────────────────────────────────────────
function startNewChat() {
    currentChatId   = null;
    currentDocId    = null;
    currentDocTitle = null;
    pendingQuestion = null;
    isSending       = false;
    updateDocIndicator();   // will disable input
    renderWelcomeState();
    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
}

// ── Welcome state ──────────────────────────────────────
function renderWelcomeState() {
    $('messages').innerHTML = `
        <div class="welcome-state" id="welcomeState">
            <div class="welcome-icon-wrap">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
            </div>
            <h2>Start a new conversation</h2>
            <p>Select a document then ask anything about your HR policies.</p>
            <div class="suggestions">
                <button class="suggestion-btn" data-q="What is the remote work policy?">Remote Work Policy</button>
                <button class="suggestion-btn" data-q="What are the leave policies?">Leave Policies</button>
                <button class="suggestion-btn" data-q="What health benefits are provided?">Health Benefits</button>
                <button class="suggestion-btn" data-q="What is the disciplinary procedure?">Disciplinary Procedure</button>
                <button class="suggestion-btn" data-q="How do performance reviews work?">Performance Reviews</button>
            </div>
        </div>
    `;
    bindSuggestions();
}

function hideWelcomeState() {
    const ws = $('welcomeState');
    if (ws) ws.remove();
}

function bindSuggestions() {
    document.querySelectorAll('.suggestion-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const q = btn.dataset.q;
            if (q) sendMessage(q);
        });
    });
}

// ── Chat history ───────────────────────────────────────
async function loadChatHistory() {
    try {
        const res  = await fetch('/api/chats/');
        const data = await res.json();
        renderChatHistory(data.chats || []);
    } catch (e) {
        console.error('Failed to load chat history', e);
    }
}

function renderChatHistory(chats) {
    const list = $('chatList');
    list.innerHTML = '';

    if (!chats.length) {
        list.innerHTML = '<div class="empty-history">No chats yet</div>';
        return;
    }

    chats.forEach(chat => {
        const item = document.createElement('div');
        item.className = 'chat-item' + (chat.id === currentChatId ? ' active' : '');
        item.innerHTML = `
            <svg class="chat-item-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M14 2H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3l2 2 2-2h5a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>
            </svg>
            <span class="chat-item-text" title="${chat.title}">${chat.title}</span>
            <button class="chat-item-delete" title="Delete">
                <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                    <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                </svg>
            </button>
        `;
        item.querySelector('.chat-item-delete').addEventListener('click', e => {
            e.stopPropagation();
            deleteChat(chat.id, item);
        });
        item.addEventListener('click', e => {
            if (!e.target.closest('.chat-item-delete')) loadChat(chat.id, item);
        });
        list.appendChild(item);
    });
}

async function loadChat(chatId, itemEl) {
    if (chatId === currentChatId) return;
    showLoading('Loading conversation…');
    try {
        const res  = await fetch(`/api/chats/${chatId}/`);
        const data = await res.json();

        currentChatId   = chatId;
        currentDocId    = data.document_id || null;
        currentDocTitle = null;
        if (currentDocId) {
            const doc = availableDocs.find(d => String(d.id) === String(currentDocId));
            if (doc) currentDocTitle = doc.title;
        }
        updateDocIndicator();

        $('messages').innerHTML = '';
        (data.messages || []).forEach(msg => appendMessage(msg.role, msg.content, msg.citations));

        document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
        if (itemEl) itemEl.classList.add('active');

        $('messages').scrollTop = $('messages').scrollHeight;
        hideLoading();
    } catch (e) {
        hideLoading();
        showToast('Failed to load conversation', 'error');
    }
}

async function deleteChat(chatId, itemEl) {
    if (!confirm('Delete this conversation?')) return;
    showLoading('Deleting…');
    try {
        const res = await fetch(`/api/chats/${chatId}/`, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': getCookie('csrftoken') }
        });
        hideLoading();
        if (res.ok) {
            if (currentChatId === chatId) startNewChat();
            itemEl.remove();
        } else {
            showToast('Failed to delete', 'error');
        }
    } catch (e) {
        hideLoading();
        showToast('Failed to delete', 'error');
    }
}

// ── Documents ──────────────────────────────────────────
async function loadDocuments() {
    try {
        const res  = await fetch('/api/documents/');
        const data = await res.json();
        availableDocs = data.documents || [];
    } catch (e) {
        console.error('Failed to load documents', e);
    }
}

// ── Document selector modal ────────────────────────────
function showDocSelectorModal(question) {
    if (!availableDocs.length) {
        showToast('Please upload a document first', 'warning', 'No documents');
        return;
    }
    if (availableDocs.length === 1 && question) {
        setCurrentDoc(availableDocs[0]);
        sendMessageWithDoc(question);
        return;
    }

    pendingQuestion = question;
    const list = $('docSelectorList');
    list.innerHTML = '';
    availableDocs.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'doc-selector-item' + (String(doc.id) === String(currentDocId) ? ' selected' : '');
        item.innerHTML = `
            <div class="doc-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
            </div>
            <div>
                <div class="doc-selector-name">${doc.title}</div>
                <div class="doc-selector-meta">${doc.chunks_count} sections</div>
            </div>
        `;
        item.addEventListener('click', () => {
            setCurrentDoc(doc);
            closeModal('docSelectorModal');
            if (pendingQuestion) {
                sendMessageWithDoc(pendingQuestion);
                pendingQuestion = null;
            }
        });
        list.appendChild(item);
    });
    openModal('docSelectorModal');
}

function setCurrentDoc(doc) {
    currentDocId    = doc.id;
    currentDocTitle = doc.title;
    updateDocIndicator();
}

// ── Documents list modal ───────────────────────────────
function populateDocumentsModal() {
    const container = $('documentsListContainer');
    if (!availableDocs.length) {
        container.innerHTML = `<p style="color:var(--text-muted);font-size:14px;text-align:center;padding:24px 0;">
            No documents uploaded yet. Use "Upload Document" to add one.</p>`;
        return;
    }
    container.innerHTML = '';
    availableDocs.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'doc-selector-item' + (String(doc.id) === String(currentDocId) ? ' selected' : '');
        item.innerHTML = `
            <div class="doc-icon-wrap">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                </svg>
            </div>
            <div style="flex:1">
                <div class="doc-selector-name">${doc.title}</div>
                <div class="doc-selector-meta">${doc.chunks_count} sections indexed</div>
            </div>
            <button class="btn-primary" style="flex:0;padding:7px 14px;font-size:12px;">Chat</button>
        `;
        item.querySelector('.btn-primary').addEventListener('click', () => {
            setCurrentDoc(doc);
            closeModal('documentsModal');
            startNewChat();
        });
        container.appendChild(item);
    });
}

// ── Send message ───────────────────────────────────────
function sendMessage(questionOverride) {
    const input    = $('questionInput');
    const question = (questionOverride || input.value).trim();
    if (!question || isSending) return;
    if (!questionOverride) { input.value = ''; autoResize(input); }

    if (!currentDocId) {
        if (!availableDocs.length) {
            showToast('Please upload a document first', 'warning', 'No documents');
            return;
        }
        pendingQuestion = question;
        showDocSelectorModal(question);
        return;
    }
    sendMessageWithDoc(question);
}

async function sendMessageWithDoc(question) {
    if (isSending) return;
    isSending = true;
    $('sendBtn').disabled = true;

    hideWelcomeState();
    appendMessage('user', question);
    const loadingEl = appendLoadingMessage();

    try {
        const res = await fetch('/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ question, chat_id: currentChatId, document_id: currentDocId })
        });
        const data = await res.json();
        loadingEl.remove();

        if (data.error) {
            appendMessage('assistant', data.error, null, true);
            showToast(data.error, 'error');
        } else {
            appendMessage('assistant', data.response, data.citations);
            if (data.chat_id && !currentChatId) currentChatId = data.chat_id;
            loadChatHistory();
        }
    } catch (e) {
        loadingEl.remove();
        appendMessage('assistant', 'Something went wrong. Please try again.', null, true);
        showToast('Request failed', 'error');
    }

    isSending = false;
    $('sendBtn').disabled = false;
}

// ── Append messages ────────────────────────────────────
function appendMessage(role, content, citations, isError = false) {
    const container = $('messages');
    const wrapper   = document.createElement('div');
    wrapper.className = `message ${role}`;

    // Safely escape then format
    const safe = content
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const formatted = safe.replace(/\n\n+/g,'</p><p>').replace(/\n/g,'<br>');

    const header = role === 'assistant'
        ? `<div class="msg-header">
               <div class="assistant-avatar">
                   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                       <path d="M9 12L11 14L15 10"/>
                   </svg>
               </div>
               <span>HR Assistant</span>
           </div>`
        : `<div class="msg-header"><span>You</span></div>`;

    let citHtml = '';
    if (citations && citations.length) {
        citHtml = '<div class="citations">' +
            citations.map(c => `
                <div class="citation-card">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <div>
                        <div class="citation-doc">${c.document || ''}</div>
                        <div class="citation-meta">${c.section || ''} · Page ${c.page || ''}</div>
                    </div>
                </div>`).join('') +
        '</div>';
    }

    wrapper.innerHTML = `${header}<div class="msg-body"><p>${formatted}</p>${citHtml}</div>`;
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
    return wrapper;
}

function appendLoadingMessage() {
    const container = $('messages');
    const wrapper   = document.createElement('div');
    wrapper.className = 'message assistant';
    wrapper.innerHTML = `
        <div class="msg-header">
            <div class="assistant-avatar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5">
                    <path d="M9 12L11 14L15 10"/>
                </svg>
            </div>
            <span>HR Assistant</span>
        </div>
        <div class="msg-body">
            <div class="loading-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;
    return wrapper;
}

// ── Input auto-resize ──────────────────────────────────
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}
$('questionInput').addEventListener('input', function() { autoResize(this); });
$('questionInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});
$('sendBtn').addEventListener('click', () => sendMessage());

// ── Welcome modal (API key) ────────────────────────────
async function checkApiKeys() {
    try {
        const res  = await fetch('/api/check-keys/');
        const data = await res.json();
        if (!data.has_keys) openModal('welcomeModal');
    } catch (e) {}
}

$('welcomeSkipBtn').addEventListener('click', () => closeModal('welcomeModal'));
$('welcomeSaveBtn').addEventListener('click', async () => {
    const provider = $('welcomeProvider').value;
    const apiKey   = $('welcomeApiKey').value.trim();
    if (!apiKey) { showToast('Please enter an API key', 'warning'); return; }

    showLoading('Saving API key…');
    try {
        const res = await fetch('/api/save-key/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ provider, api_key: apiKey })
        });
        hideLoading();
        if (res.ok) {
            closeModal('welcomeModal');
            showToast('API key saved!', 'success');
            currentProvider = provider;
            $('modelSelect').value = provider;
        } else {
            const d = await res.json().catch(() => ({}));
            showToast(d.error || 'Failed to save key', 'error');
        }
    } catch (e) {
        hideLoading();
        showToast('Failed to save key', 'error');
    }
});

// ── Close buttons ──────────────────────────────────────
$('docSelectorCloseBtn').addEventListener('click',  () => { closeModal('docSelectorModal'); pendingQuestion = null; });
$('docSelectorCancelBtn').addEventListener('click', () => { closeModal('docSelectorModal'); pendingQuestion = null; });
$('documentsCloseBtn').addEventListener('click',    () => closeModal('documentsModal'));
$('uploadCloseBtn').addEventListener('click',       () => closeModal('uploadModal'));

// ── Upload ─────────────────────────────────────────────
const uploadArea = $('uploadArea');
const fileInput  = $('fileInput');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', e => { if (e.target.files[0]) uploadFile(e.target.files[0]); });

async function uploadFile(file) {
    const validExts = /\.(pdf|docx)$/i;
    if (!validExts.test(file.name)) { showToast('Please upload a PDF or DOCX file', 'warning'); return; }
    if (file.size > 52428800) { showToast('File is too large. Max size is 50 MB', 'warning'); return; }

    uploadArea.classList.add('hidden');
    $('uploadProgress').classList.remove('hidden');
    $('progressFill').style.width = '0%';
    $('progressText').textContent = 'Uploading…';

    const formData = new FormData();
    formData.append('file', file);
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            $('progressFill').style.width = pct + '%';
            $('progressText').textContent = `Uploading… ${pct}%`;
        }
    });

    xhr.addEventListener('load', async () => {
        if (xhr.status === 200 || xhr.status === 302) {
            $('progressFill').style.width = '100%';
            $('progressText').textContent = 'Processing document…';
            await loadDocuments();
            setTimeout(() => {
                closeModal('uploadModal');
                uploadArea.classList.remove('hidden');
                $('uploadProgress').classList.add('hidden');
                fileInput.value = '';
                showToast('Document uploaded successfully!', 'success', 'Upload complete');
            }, 1500);
        } else {
            let msg = 'Upload failed';
            try { msg = JSON.parse(xhr.responseText).error || msg; } catch (_) {}
            showToast(msg, 'error');
            uploadArea.classList.remove('hidden');
            $('uploadProgress').classList.add('hidden');
        }
    });

    xhr.addEventListener('error', () => {
        showToast('Upload failed. Please try again.', 'error');
        uploadArea.classList.remove('hidden');
        $('uploadProgress').classList.add('hidden');
    });

    xhr.open('POST', '/upload/');
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
    xhr.send(formData);
}

// ── Model selector ─────────────────────────────────────
$('modelSelect').addEventListener('change', async function() {
    const provider = this.value;
    try {
        const res  = await fetch(`/api/check-provider-key/?provider=${provider}`);
        const data = await res.json();
        if (!data.has_key) {
            this.value = currentProvider;
            showToast(`Add a ${provider} API key in Settings first`, 'warning', 'API Key Required');
            return;
        }
        // Persist preference (no key change needed)
        await fetch('/api/save-key/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCookie('csrftoken') },
            body: JSON.stringify({ provider, api_key: '__keep__' })
        }).catch(() => {});
        currentProvider = provider;
        showToast(`Switched to ${provider}`, 'success');
    } catch (e) {
        showToast('Failed to switch provider', 'error');
    }
});

async function loadCurrentProvider() {
    try {
        const res  = await fetch('/api/current-provider/');
        const data = await res.json();
        if (data.provider) {
            currentProvider = data.provider;
            $('modelSelect').value = data.provider;
        }
    } catch (e) {}
}

// ── Init ───────────────────────────────────────────────
bindSuggestions();
updateDocIndicator(); // lock input until doc is selected

document.addEventListener('DOMContentLoaded', async () => {
    await loadDocuments();
    await loadChatHistory();
    await loadCurrentProvider();
    await checkApiKeys();
    updateDocIndicator(); // re-evaluate after docs loaded
});
