// Show loading overlay
function showLoading(message = 'Loading...') {
    document.getElementById('loadingOverlay').classList.add('active');
    document.getElementById('loadingText').textContent = message;
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

// Toggle sidebar
function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('expanded');
}

// Toggle settings
function toggleSettings() {
    const sidebar = document.getElementById('sidebar');
    const panel = document.getElementById('settingsPanel');
    
    if (!sidebar.classList.contains('expanded')) {
        sidebar.classList.add('expanded');
    }
    
    panel.classList.toggle('active');
}

// Save settings
async function saveSettings() {
    const provider = document.getElementById('providerSelect').value;
    const apiKey = document.getElementById('apiKeyInput').value;
    
    if (!apiKey) {
        alert('Please enter an API key');
        return;
    }
    
    showLoading('Saving settings...');
    
    try {
        const response = await fetch('/api/save-key/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ provider, api_key: apiKey })
        });
        
        hideLoading();
        
        if (response.ok) {
            alert('✅ Settings saved successfully!');
            document.getElementById('apiKeyInput').value = '';
        } else {
            alert('❌ Error saving settings');
        }
    } catch (error) {
        hideLoading();
        alert('❌ Error saving settings');
    }
}

// Show chat
function showChat() {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.closest('.nav-item').classList.add('active');
}

// Show history
function showHistory() {
    alert('📜 History feature coming soon!');
}

// Toggle document panel
function toggleDocPanel() {
    document.getElementById('docPanel').classList.toggle('open');
}

// Ask question
function askQuestion(question) {
    document.getElementById('questionInput').value = question;
    sendMessage();
}

// Send message
async function sendMessage() {
    const input = document.getElementById('questionInput');
    const question = input.value.trim();
    
    if (!question) return;
    
    const welcomeState = document.getElementById('welcomeState');
    if (welcomeState) welcomeState.style.display = 'none';
    
    addMessage('user', question);
    input.value = '';
    
    const loadingId = addMessage('assistant', '<div class="loading-dots"><span></span><span></span><span></span></div>');
    
    try {
        const response = await fetch('/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ question })
        });
        
        const data = await response.json();
        document.getElementById(loadingId).remove();
        
        if (data.error) {
            addMessage('assistant', `⚠️ ${data.error}`);
        } else {
            addMessage('assistant', data.response, data.citations);
        }
    } catch (error) {
        document.getElementById(loadingId).remove();
        addMessage('assistant', '⚠️ Something went wrong. Please try again.');
    }
}

// Add message with name and better formatting
function addMessage(role, content, citations = null) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageId = 'msg-' + Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.id = messageId;
    
    let html = '';
    
    if (role === 'assistant') {
        html += `<div class="message-header"><svg class="avatar" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" fill="#10B981"/><path d="M9 12L11 14L15 10" stroke="white" stroke-width="2" stroke-linecap="round"/></svg><span>HR Assistant</span></div>`;
    } else {
        html += `<div class="message-header"><span>You</span></div>`;
    }
    
    const formattedContent = content.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>');
    html += `<div class="message-content"><p>${formattedContent}</p>`;
    
    if (citations && citations.length > 0) {
        html += '<div class="citations-scroll">';
        citations.forEach(citation => {
            html += `<div class="citation-card"><svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2l2 4h4l-3 3 1 4-4-2-4 2 1-4-3-3h4z"/></svg><div><div class="citation-title">${citation.section}</div><div class="citation-page">Page ${citation.page}</div></div></div>`;
        });
        html += '</div>';
    }
    
    html += '</div>';
    messageDiv.innerHTML = html;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageId;
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Add loading dots CSS
const style = document.createElement('style');
style.textContent = `
    .loading-dots {
        display: flex;
        gap: 4px;
        padding: 8px 0;
    }
    .loading-dots span {
        width: 8px;
        height: 8px;
        background: #10b981;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out both;
    }
    .loading-dots span:nth-child(1) { animation-delay: -0.32s; }
    .loading-dots span:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// Check if user has API key on page load
window.addEventListener('DOMContentLoaded', function() {
    // Check if user is new (no API keys)
    fetch('/api/check-keys/')
        .then(r => r.json())
        .then(data => {
            if (!data.has_keys) {
                document.getElementById('welcomeModal').classList.add('active');
            }
        });
});

// Save API key from welcome modal
async function saveWelcomeKey() {
    const provider = document.getElementById('modalProvider').value;
    const apiKey = document.getElementById('modalApiKey').value;
    
    if (!apiKey) {
        alert('Please enter an API key');
        return;
    }
    
    showLoading('Saving your API key...');
    
    try {
        const response = await fetch('/api/save-key/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ provider, api_key: apiKey })
        });
        
        hideLoading();
        
        if (response.ok) {
            document.getElementById('welcomeModal').classList.remove('active');
            alert('✅ API key saved! You can now upload documents.');
        } else {
            alert('❌ Error saving API key');
        }
    } catch (error) {
        hideLoading();
        alert('❌ Error saving API key');
    }
}

// Skip welcome modal
function skipWelcome() {
    document.getElementById('welcomeModal').classList.remove('active');
}

// Show upload modal
function showUploadModal() {
    document.getElementById('uploadModal').classList.add('active');
}

// Close upload modal
function closeUploadModal() {
    document.getElementById('uploadModal').classList.remove('active');
}

// Handle file select
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        uploadFile(file);
    }
}

// Upload area click
document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('click', function() {
            document.getElementById('fileInput').click();
        });
        
        // Drag and drop
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = '#10b981';
        });
        
        uploadArea.addEventListener('dragleave', function() {
            uploadArea.style.borderColor = '';
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadArea.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (file && file.type === 'application/pdf') {
                uploadFile(file);
            } else {
                alert('Please upload a PDF file');
            }
        });
    }
});

// Upload file
async function uploadFile(file) {
    document.getElementById('uploadArea').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'block';
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total) * 100;
                document.getElementById('progressFill').style.width = percent + '%';
                document.getElementById('progressText').textContent = `Uploading... ${Math.round(percent)}%`;
            }
        });
        
        xhr.addEventListener('load', function() {
            if (xhr.status === 200) {
                document.getElementById('progressText').textContent = '✅ Upload complete! Processing document...';
                setTimeout(() => {
                    closeUploadModal();
                    document.getElementById('uploadArea').style.display = 'block';
                    document.getElementById('uploadProgress').style.display = 'none';
                    document.getElementById('progressFill').style.width = '0%';
                    alert('✅ Document uploaded successfully!');
                    location.reload();
                }, 2000);
            } else {
                alert('❌ Upload failed');
                document.getElementById('uploadArea').style.display = 'block';
                document.getElementById('uploadProgress').style.display = 'none';
            }
        });
        
        xhr.open('POST', '/upload/');
        xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));
        xhr.send(formData);
        
    } catch (error) {
        alert('❌ Upload failed');
        document.getElementById('uploadArea').style.display = 'block';
        document.getElementById('uploadProgress').style.display = 'none';
    }
}

// Global variables
let currentChatId = null;
let currentDocId = null;
let pendingQuestion = null;

// Load chat history on page load
window.addEventListener('DOMContentLoaded', function() {
    loadChatHistory();
    loadDocuments();
});

// Load chat history
async function loadChatHistory() {
    try {
        const response = await fetch('/api/chats/');
        const data = await response.json();
        
        const historyContainer = document.getElementById('chatHistory');
        const existingLabel = historyContainer.querySelector('.nav-label');
        historyContainer.innerHTML = '';
        if (existingLabel) historyContainer.appendChild(existingLabel);
        
        data.chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            if (chat.id === currentChatId) chatItem.classList.add('active');
            chatItem.innerHTML = `
                <svg class="chat-item-icon" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M14 2H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3l2 2 2-2h5a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/>
                </svg>
                <span class="chat-item-text">${chat.title}</span>
                <button class="chat-item-delete" onclick="deleteChat(event, '${chat.id}')">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                </button>
            `;
            
            chatItem.addEventListener('click', (e) => {
                if (!e.target.closest('.chat-item-delete')) {
                    loadChat(chat.id);
                }
            });
            
            historyContainer.appendChild(chatItem);
        });
    } catch (error) {
        console.error('Error loading chat history:', error);
    }
}

// Delete chat
async function deleteChat(event, chatId) {
    event.stopPropagation();
    
    if (!confirm('Delete this chat?')) return;
    
    showLoading('Deleting chat...');
    
    try {
        const response = await fetch(`/api/chats/${chatId}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        hideLoading();
        
        if (response.ok) {
            if (currentChatId === chatId) {
                showNewChat();
            }
            loadChatHistory();
        } else {
            alert('❌ Error deleting chat');
        }
    } catch (error) {
        hideLoading();
        alert('❌ Error deleting chat');
    }
}

// Load documents
async function loadDocuments() {
    try {
        const response = await fetch('/api/documents/');
        const data = await response.json();
        window.availableDocuments = data.documents;
    } catch (error) {
        console.error('Error loading documents:', error);
    }
}

// Show new chat
function showNewChat() {
    currentChatId = null;
    currentDocId = null;
    document.getElementById('chatMessages').innerHTML = `
        <div class="welcome-state" id="welcomeState">
            <div class="welcome-icon">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                    <path d="M30 20h20v40H30z" fill="#E8F5E9"/>
                    <circle cx="25" cy="25" r="15" fill="#C8E6C9"/>
                    <path d="M20 25c0-3 2-5 5-5s5 2 5 5-2 5-5 5-5-2-5-5z" fill="#81C784"/>
                </svg>
            </div>
            <h2>Hello. I'm ready to help you<br>navigate company policies.</h2>
            <div class="suggestion-chips">
                <button class="chip" onclick="askQuestion('What is the remote work policy?')">Ask about Remote Work</button>
                <button class="chip" onclick="askQuestion('What are the leave policies?')">View Leave Policies</button>
                <button class="chip" onclick="askQuestion('What health benefits are provided?')">Check Health Benefits</button>
                <button class="chip" onclick="askQuestion('What is the disciplinary procedure?')">Find Disciplinary Procedures</button>
            </div>
        </div>
    `;
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
}

// Load specific chat
async function loadChat(chatId) {
    showLoading('Loading chat...');
    
    try {
        const response = await fetch(`/api/chats/${chatId}/`);
        const data = await response.json();
        
        currentChatId = chatId;
        currentDocId = data.document_id;
        
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = '';
        
        data.messages.forEach(msg => {
            addMessage(msg.role, msg.content, msg.citations);
        });
        
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        event.target.closest('.chat-item').classList.add('active');
        
        hideLoading();
    } catch (error) {
        hideLoading();
        alert('Error loading chat');
    }
}

// Show document selector before sending message
function showDocSelector(question) {
    if (!window.availableDocuments || window.availableDocuments.length === 0) {
        alert('Please upload a document first');
        return;
    }
    
    if (window.availableDocuments.length === 1) {
        // Only one document, use it directly
        currentDocId = window.availableDocuments[0].id;
        sendMessageWithDoc(question);
        return;
    }
    
    // Multiple documents, show selector
    pendingQuestion = question;
    const listContainer = document.getElementById('docSelectorList');
    listContainer.innerHTML = '';
    
    window.availableDocuments.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'doc-selector-item';
        item.onclick = () => selectDocument(doc.id);
        item.innerHTML = `
            <h4>📄 ${doc.title}</h4>
            <p>${doc.chunks_count} sections • ${doc.pages} pages</p>
        `;
        listContainer.appendChild(item);
    });
    
    document.getElementById('docSelectorModal').classList.add('active');
}

// Select document and send message
function selectDocument(docId) {
    currentDocId = docId;
    document.getElementById('docSelectorModal').classList.remove('active');
    sendMessageWithDoc(pendingQuestion);
}

// Close document selector
function closeDocSelector() {
    document.getElementById('docSelectorModal').classList.remove('active');
    pendingQuestion = null;
}

// Send message with document context
async function sendMessageWithDoc(question) {
    const welcomeState = document.getElementById('welcomeState');
    if (welcomeState) welcomeState.style.display = 'none';
    
    addMessage('user', question);
    
    const loadingId = addMessage('assistant', '<div class="loading-dots"><span></span><span></span><span></span></div>');
    
    try {
        const response = await fetch('/chat/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify({ 
                question,
                chat_id: currentChatId,
                document_id: currentDocId
            })
        });
        
        const data = await response.json();
        document.getElementById(loadingId).remove();
        
        if (data.error) {
            addMessage('assistant', `⚠️ ${data.error}`);
        } else {
            addMessage('assistant', data.response, data.citations);
            currentChatId = data.chat_id;
            loadChatHistory();
        }
    } catch (error) {
        document.getElementById(loadingId).remove();
        addMessage('assistant', '⚠️ Something went wrong. Please try again.');
    }
}

// Override sendMessage to use document selector
async function sendMessage() {
    const input = document.getElementById('questionInput');
    const question = input.value.trim();
    
    if (!question) return;
    
    input.value = '';
    showDocSelector(question);
}

// Global current model
let currentModelProvider = 'huggingface';

// Show toast notification
function showToast(message, type = 'info', title = '') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    };
    
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            ${title ? `<div class="toast-title">${title}</div>` : ''}
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    container.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Replace all alert() calls with showToast()
window.alert = function(message) {
    const type = message.includes('✅') ? 'success' : message.includes('❌') ? 'error' : 'info';
    showToast(message.replace(/[✅❌⚠️ℹ️]/g, '').trim(), type);
};

// Toggle model menu
function toggleModelMenu() {
    document.getElementById('modelMenu').classList.toggle('active');
}

// Close model menu when clicking outside
document.addEventListener('click', function(e) {
    const menu = document.getElementById('modelMenu');
    const btn = document.getElementById('modelBtn');
    if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.remove('active');
    }
});



// Select model from dropdown
async function selectModel(provider) {
    // Check if user has API key for this provider
    try {
        const response = await fetch(`/api/check-provider-key/?provider=${provider}`);
        const data = await response.json();
        
        if (!data.has_key) {
            // Revert dropdown to previous selection
            document.getElementById('modelSelector').value = currentModelProvider;
            
            // Show API key prompt
            const providerNames = {
                'huggingface': 'HuggingFace',
                'openai': 'OpenAI',
                'cohere': 'Cohere'
            };
            
            showToast(`Please add your ${providerNames[provider]} API key first`, 'warning', 'API Key Required');
            
            // Open modal with provider pre-selected
            document.getElementById('modalProvider').value = provider;
            document.getElementById('welcomeModal').classList.add('active');
            return;
        }
        
        // Update current model
        currentModelProvider = provider;
        showToast(`Switched to ${providerNames[provider]}`, 'success');
        
    } catch (error) {
        showToast('Error checking API key', 'error');
    }
}

// Load current model on page load
window.addEventListener('DOMContentLoaded', function() {
    fetch('/api/current-provider/')
        .then(r => r.json())
        .then(data => {
            if (data.provider) {
                currentModelProvider = data.provider;
                document.getElementById('modelSelector').value = data.provider;
            }
        });
});
