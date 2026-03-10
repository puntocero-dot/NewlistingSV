const fileInput = document.getElementById('file-input');
const previewImg = document.getElementById('image-preview');
const analyzeBtn = document.getElementById('analyze-btn');
const loader = document.getElementById('loader');
const aiResults = document.getElementById('ai-results');

let currentFile = null;

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
            analyzeBtn.style.display = 'block';
            aiResults.classList.add('hidden');
        };
        reader.readAsDataURL(file);
    }
});

async function analyzeImage() {
    if (!currentFile) return;

    analyzeBtn.disabled = true;
    loader.style.display = 'block';
    aiResults.classList.add('hidden');

    try {
        const reader = new FileReader();
        reader.readAsDataURL(currentFile);
        reader.onload = async () => {
            const base64data = reader.result.split(',')[1];
            
            // Mocking agentId for now
            const payload = {
                agentId: 'agent-1234',
                image: base64data,
                mimeType: currentFile.type
            };

            const response = await fetch('/api/agents/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            
            loader.style.display = 'none';
            analyzeBtn.disabled = false;
            
            if (response.ok) {
                aiResults.innerText = data.analysis;
                aiResults.classList.remove('hidden');
            } else {
                alert('Error al procesar la imagen.');
            }
        };
    } catch (error) {
        console.error('Error analyzing image:', error);
        loader.style.display = 'none';
        analyzeBtn.disabled = false;
        alert('Error conectando con ARIA.');
    }
}
