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
            addMessage('assistant', data.answer, data.citations);
        }
    } catch (error) {
        document.getElementById(loadingId).remove();
        addMessage('assistant', '⚠️ Something went wrong. Please try again.');
    }
}

// Add message
function addMessage(role, content, citations = null) {
    const messagesContainer = document.getElementById('chatMessages');
    const messageId = 'msg-' + Date.now();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    messageDiv.id = messageId;
    
    let html = '';
    
    if (role === 'assistant') {
        html += '<div class="avatar"><svg width="32" height="32" viewBox="0 0 32 32" fill="none"><circle cx="16" cy="16" r="14" fill="#10B981"/><path d="M12 16L15 19L20 13" stroke="white" stroke-width="2" stroke-linecap="round"/></svg></div>';
    }
    
    html += `<div class="message-content"><p>${content}</p>`;
    
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
