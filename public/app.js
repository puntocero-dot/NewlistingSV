async function init() {
    loadProperties();
    loadAgents();
}

async function loadProperties() {
    try {
        const res = await fetch('/api/properties');
        const properties = await res.json();
        const grid = document.getElementById('properties-grid');
        grid.innerHTML = properties.map(p => `
            <div class="property-card">
                <div class="prop-img">🏠</div>
                <div class="prop-info">
                    <span class="prop-tag">${p.mode}</span>
                    <h3>${p.title}</h3>
                    <p>${p.zone}</p>
                    <div class="prop-price">$${p.price.toLocaleString()}</div>
                </div>
            </div>
        `).join('');
    } catch (e) { console.error('Error properties:', e); }
}

async function loadAgents() {
    try {
        const res = await fetch('/api/agents');
        const agents = await res.json();
        const list = document.getElementById('agents-list');
        list.innerHTML = agents.map(a => `
            <div class="agent-mini-card">
                <h4>${a.name}</h4>
                <span>${a.zone || 'Global'}</span>
            </div>
        `).join('');
    } catch (e) { console.error('Error agents:', e); }
}

function openChat() {
    document.getElementById('chat-widget').classList.remove('hidden');
}

init();


function closeChat() {
    document.getElementById('chat-widget').classList.add('hidden');
}

async function sendMessage() {
    const input = document.getElementById('user-input');
    const text = input.value.trim();
    if (!text) return;

    appendMessage('user', text);
    input.value = '';

    try {
        const response = await fetch('/api/conversations/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: getHistory() })
        });
        
        const data = await response.json();
        appendMessage('model', data.response);
    } catch (error) {
        console.error('Error:', error);
        appendMessage('model', 'Lo siento, tuve un problema al procesar tu solicitud.');
    }
}

function appendMessage(role, text) {
    const container = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerText = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function getHistory() {
    const messages = document.querySelectorAll('.msg');
    return Array.from(messages).map(m => ({
        role: m.classList.contains('user') ? 'user' : 'model',
        content: m.innerText
    }));
}

// Enter key support
document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});
