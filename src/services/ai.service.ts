import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export class AIService {
  private model: GenerativeModel;
  private persona: string = `
    Eres ARIA (Antigravity Real Estate Intelligence Agent), el cerebro operativo de una firma de bienes raíces de lujo.
    No eres un chatbot genérico — eres el arquitecto de experiencias de compra de alto valor.
    Tu misión es orquestar con precisión quirúrgica la comunicación entre el catálogo de propiedades, el CRM, los calendarios de agentes y el cliente final.

    Principios de operación:
    - Velocidad: Respuestas rápidas.
    - Precisión: Cero datos inventados. Si no tienes información, lo dices.
    - Tono: Consultor de alto nivel — no vendedor. Empático, conciso, confiable.
    - Jerarquía: Primero califica, luego educa, después cierra.

    MÓDULO 1 — CLASIFICACIÓN INTELIGENTE DE CARTERA
    - Nunca presentes más de 3 propiedades a la vez. Filtra primero, muestra después.

    MÓDULO 4 — INTELIGENCIA CONVERSACIONAL
    - Negative Search Flow: Si no encuentran lo que buscan, activa perfilamiento dinámico (máx 4 preguntas: presupuesto, comprar/alquilar, zona, requisitos especiales).
    - Pre-calificador Financiero: Valida capacidad real antes de agendar (ratio 30% ingreso/cuota).
  `;

  constructor() {
    const apiKey = process.env.GOOGLE_AI_API_KEY || '';
    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY') {
        this.model = genAI.getGenerativeModel({ 
          model: 'gemini-2.0-flash',
          systemInstruction: this.persona 
        });
    } else {
        this.model = null as any; // Mock mode
    }
  }

  async generateResponse(prompt: string, history: any[] = []) {
    if (!this.model) {
        return "*(Modo Demo: API Key de Gemini no configurada)* ¡Hola! Soy ARIA en versión demo local. ¿En qué puedo asistirte?";
    }
    let validHistory: any[] = [];
    for (const msg of history) {
      if (!msg.content) continue;
      const role = msg.role === 'user' ? 'user' : 'model';
      // Gemini history must start with 'user'
      if (validHistory.length === 0 && role !== 'user') continue;
      // Roles must alternate
      if (validHistory.length > 0 && validHistory[validHistory.length - 1].role === role) continue;
      
      validHistory.push({
        role,
        parts: [{ text: msg.content }],
      });
    }

    const chat = this.model.startChat({
      history: validHistory,
    });

    const result = await chat.sendMessage(prompt);
    return result.response.text();
  }

  async analyzeImage(imageBuffer: Buffer, mimeType: string, prompt: string) {
    const result = await this.model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBuffer.toString('base64'),
          mimeType,
        },
      },
    ]);
    return result.response.text();
  }
}

export const aiService = new AIService();
