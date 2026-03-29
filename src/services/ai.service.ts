import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export class AIService {
  private model: GenerativeModel;
  private basePersona: string = `
    Eres ARIA, consultora inmobiliaria de lujo en El Salvador. Perfilas prospectos y conectas con propiedades reales.
    PRINCIPIOS: Asertiva, empática, elegante. No inventes propiedades. Si mencionan un nombre/título del catálogo, muéstralo de inmediato.
    RECOLECCIÓN DE DATOS: Aclara que un ASESOR HUMANO (New Listing) contactará. Tú no envías correos.
    REGLA DE ORO: Máximo UNA (1) pregunta por mensaje. Jamás uses dos signos '?'.
    PASOS: 1.Compra/Alquiler? -> 2.Zona? -> 3.Presupuesto? -> 4.Oferta? -> 5.Email? -> 6.Teléfono? -> 7.Visita?
    ESTILO: Precios "$X,000". Prohibido decir que tú gestionarás citas; el humano lo hará.
  `;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || '';
    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY') {
        this.model = genAI.getGenerativeModel({ 
          model: 'gemini-2.5-flash-lite',
          systemInstruction: this.basePersona 
        });
    } else {
        this.model = null as any;
    }
  }

  private buildCatalogContext(properties: any[], origin: string = ''): string {
    if (!properties || properties.length === 0) {
      return '\n\nCATÁLOGO ACTIVO: (vacío — no hay propiedades disponibles actualmente)\n';
    }
    const lines = properties.map(p => {
      const price = p.mode === 'Alquiler' ? `$${p.price}/mes` : `$${p.price.toLocaleString()}`;
      const link = origin ? `${origin}/#property=${p.id}` : `ID: ${p.id}`;
      return `- ${p.title} | ${p.mode} | ${price} | ${p.zone} | ${p.category} | ${p.bedrooms}hab | ${p.surface}m² | LINK: ${link}`;
    }).join('\n');
    return `\n\nCATÁLOGO ACTIVO:\n${lines}\n`;
  }

  async generateResponseWithContext(prompt: string, history: any[] = [], properties: any[] = [], context: { caseId?: string, agentName?: string, origin?: string } = {}) {
    if (!this.model) {
      return "*(Modo Demo: API Key no configurada)* Soy ARIA. ¿En qué puedo asistirte?";
    }

    const { caseId, agentName, origin } = context;
    const catalogContext = this.buildCatalogContext(properties, origin);
    
    let contextHeader = "";
    if (caseId) contextHeader += `\n[SISTEMA: El Número de Caso asignado a este cliente es ${caseId}. Menciónalo sutilmente al final o cuando sea oportuno.]`;
    if (agentName) contextHeader += `\n[SISTEMA: El asesor inmobiliario asignado es ${agentName}. Salúdalo en su nombre si el cliente pregunta por un asesor humano o si ya lo habías mencionado antes.]`;

    const enrichedPrompt = `${catalogContext}${contextHeader}\n\nMENSAJE DEL CLIENTE: ${prompt}`;

    let validHistory: any[] = [];
    const recentHistory = history.slice(-10); // Keep only last 10 messages for token optimization
    for (const msg of recentHistory) {
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

