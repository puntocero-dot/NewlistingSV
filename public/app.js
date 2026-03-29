let allProperties = [];

async function init() {
    loadProperties();
    loadAgents();
    
    // Deep linking support: check if URL has #property=ID
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
}

function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith('#property=')) {
        const id = hash.replace('#property=', '');
        openPropertyModal(id);
    }
}

async function loadProperties() {
    try {
        const res = await fetch('/api/properties');
        allProperties = await res.json();
        renderProperties(allProperties);
    } catch (e) { console.error('Error properties:', e); }
}

function renderProperties(properties) {
    const grid = document.getElementById('properties-grid');
    grid.innerHTML = properties.map(p => {
        const coverImg = p.images && p.images.length > 0
            ? `<img src="${p.images[0]}" alt="${p.title}" style="width:100%; height:100%; object-fit:cover;">`
            : `🏠`;
        return `
        <div class="property-card" onclick="openPropertyModal('${p.id}')">
            <div class="prop-img">${coverImg}</div>
            <div class="prop-info">
                <span class="prop-tag">${p.mode} &middot; ${p.category || 'General'}</span>
                <h3>${p.title}</h3>
                <p>${p.zone}</p>
                <div class="prop-price">$${p.price.toLocaleString()}</div>
            </div>
        </div>
        `;
    }).join('');
}

function filterProperties(category) {
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (category === 'all') {
        renderProperties(allProperties);
    } else {
        const filtered = allProperties.filter(p => p.category === category);
        renderProperties(filtered);
    }
}

async function openPropertyModal(id) {
    try {
        const res = await fetch(`/api/properties/${id}`);
        const p = await res.json();
        
        const coverImg = p.images && p.images.length > 0
            ? `<img src="${p.images[0]}" alt="${p.title}" style="width:100%; height:100%; object-fit:cover;">`
            : `🏠`;

        const modalBody = document.getElementById('modal-body');
        modalBody.innerHTML = `
            <div class="modal-grid">
                <div class="modal-img" style="padding:0; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#111;">${coverImg}</div>
                <div class="modal-info">
                    <span class="prop-tag">${p.mode}</span>
                    <span class="prop-tag" style="background:var(--accent);">${p.category}</span>
                    <h2>${p.title}</h2>
                    <p style="margin-bottom:0.5rem; color: #fff;">📍 ${p.zone}</p>
                    <div class="price">$${p.price.toLocaleString()}</div>
                    <p>${p.description}</p>
                    <div class="features-list">
                        ${p.features.map(f => `<span>✓ ${f}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
        document.getElementById('property-modal').classList.remove('hidden');
    } catch(e) {
        console.error('Error loading property details', e);
    }
}

function closePropertyModal() {
    document.getElementById('property-modal').classList.add('hidden');
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

    // Capture history BEFORE appending the new user message to avoid duplicate consecutive "user" roles
    const currentHistory = getHistory();

    appendMessage('user', text);
    input.value = '';

    try {
        const response = await fetch('/api/conversations/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: currentHistory })
        });
        
        const data = await response.json();
        
        if (!response.ok || !data.response) {
            throw new Error(data.error || 'Respuesta inválida del servidor');
        }
        
        appendMessage('model', data.response);
    } catch (error) {
        console.error('Error fetching chat:', error);
        appendMessage('model', 'Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo.');
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
