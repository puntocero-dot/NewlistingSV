import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export class AIService {
  private model: GenerativeModel;
  private basePersona: string = `
    Eres ARIA (Antigravity Real Estate Intelligence Agent), el cerebro operativo de una firma de bienes raíces de lujo en El Salvador.
    No eres un chatbot genérico — eres el arquitecto de experiencias de compra de alto valor.
    Tu misión: conectar al cliente ideal con la propiedad perfecta usando datos reales del catálogo activo.

    Principios de operación:
    - Velocidad: Respuestas concisas y directas.
    - Precisión: CERO datos inventados. Usa SOLO las propiedades del CATÁLOGO ACTIVO que se te provee.
    - Tono: Consultor de alto nivel — no vendedor. Empático, conciso, confiable.
    - Jerarquía: Primero califica al cliente (presupuesto, zona, tipo), luego filtra del catálogo, luego presenta máximo 3 opciones.
    - Si el cliente pregunta algo que no está en el catálogo, dilo honestamente y ofrece tomar sus datos para cuando llegue algo.

    REGLAS DE CATÁLOGO:
    - Usa SOLO las propiedades listadas en el bloque CATÁLOGO ACTIVO.
    - Nunca inventes propiedades, precios ni características.
    - Si el catálogo está vacío, dilo y ofrece notificar cuando haya disponibilidad.
    - Al mencionar una propiedad, siempre incluye: título, precio, zona y al menos 2 características.
    - Formato de precio: "$850,000" para venta, "$4,200/mes" para alquiler.

    FLOW DE CALIFICACIÓN (si el cliente no ha especificado):
    1. ¿Busca comprar o alquilar?
    2. ¿Cuál es su rango de presupuesto?
    3. ¿Qué zona o sector prefiere?
    4. ¿Necesidades especiales? (habitaciones, piscina, vista al mar, etc.)
  `;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || '';
    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY') {
        this.model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash',
          systemInstruction: this.basePersona 
        });
    } else {
        this.model = null as any;
    }
  }

  private buildCatalogContext(properties: any[]): string {
    if (!properties || properties.length === 0) {
      return '\n\nCATÁLOGO ACTIVO: (vacío — no hay propiedades disponibles actualmente)\n';
    }
    const lines = properties.map(p => {
      const features = Array.isArray(p.features) ? p.features.join(', ') : '';
      const beds = p.bedrooms ? `${p.bedrooms} hab.` : '';
      const baths = p.bathrooms ? `${p.bathrooms} baños` : '';
      const rooms = [beds, baths].filter(Boolean).join(', ');
      const price = p.mode === 'Alquiler' ? `$${p.price}/mes` : `$${p.price.toLocaleString()}`;
      return `- [${p.id}] "${p.title}" | ${p.mode} | ${price} | Zona: ${p.zone} | Categoría: ${p.category}${rooms ? ` | ${rooms}` : ''} | ${p.surface}m² | Características: ${features}${p.address ? ` | Dirección: ${p.address}` : ''}`;
    }).join('\n');
    return `\n\nCATÁLOGO ACTIVO (${properties.length} propiedades disponibles):\n${lines}\n`;
  }

  async generateResponseWithContext(prompt: string, history: any[] = [], properties: any[] = []) {
    if (!this.model) {
      return "*(Modo Demo: API Key no configurada)* Soy ARIA. ¿En qué puedo asistirte?";
    }

    const catalogContext = this.buildCatalogContext(properties);
    const enrichedPrompt = `${catalogContext}\n\nMENSAJE DEL CLIENTE: ${prompt}`;

    let validHistory: any[] = [];
    for (const msg of history) {
      if (!msg.content) continue;
      const role = msg.role === 'user' ? 'user' : 'model';
      if (validHistory.length === 0 && role !== 'user') continue;
      if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === role) continue;
      validHistory.push({ role, parts: [{ text: msg.content }] });
    }

    const chat = this.model.startChat({ history: validHistory });
    const result = await chat.sendMessage(enrichedPrompt);
    return result.response.text();
  }

  // Keep legacy method for compatibility
  async generateResponse(prompt: string, history: any[] = []) {
    return this.generateResponseWithContext(prompt, history, []);
  }

  async analyzeImage(imageBuffer: Buffer, mimeType: string, prompt: string) {
    const result = await this.model.generateContent([
      prompt,
      { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
    ]);
    return result.response.text();
  }
}

export const aiService = new AIService();

