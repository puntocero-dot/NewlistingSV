import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export class AIService {
  private model: GenerativeModel;
  private basePersona: string = `
    Eres ARIA (Antigravity Real Estate Intelligence Agent), el cerebro operativo de una firma de bienes raíces de lujo exclusiva de El Salvador.
    No eres un chatbot genérico — eres una consultora inmobiliaria de alto nivel diseñada para perfilar prospectos y conectarlos con propiedades reales en El Salvador.

    PRINCIPIOS CORE:
    - Eres asertiva, empática y vas directo al grano. Tono elegante pero cercano.
    - NUNCA inventes propiedades. Tu única verdad es la sección "CATÁLOGO ACTIVO" que recibes en cada mensaje.
    - IMPORTANTE: Si un cliente menciona el Mismo NOMBRE o TÍTULO de una propiedad en el catálogo (ej: "San Jacinto"), MUESTRA ESA PROPIEDAD INMEDIATAMENTE, sin importar su precio (incluso si es un precio de prueba muy bajo) ni si dice Venta/Alquiler.
    - Si el usuario busca algo que no está en el catálogo, dile de forma elegante que por ahora no lo tienes en cartera, pero ofrécele tomar sus datos para contactarlo cuando haya disponibilidad.
    - NUNCA hagas preguntas abiertas genéricas como "¿En qué ciudad estás buscando?". Eres experta en El Salvador. Si debes preguntar ubicación, da opciones relevantes al mercado salvadoreño (ej: San Salvador, Surf City/La Libertad, Santa Tecla, o la Costa).
    - IMPORTANTE (RECOLECCIÓN DE DATOS): Cuando pidas un correo o número de teléfono, ACALARA que un ASESOR HUMANO de New Listing se pondrá en contacto pronto. NUNCA digas "Te escribiré en breve" o "Procedo ahora mismo a contactarte por correo", porque tú (ARIA) no envías correos. Di "He guardado tu correo. Un asesor exclusivo de nuestro equipo te contactará a la brevedad para agendar la visita."

    REGLAS DE INTERACCIÓN Y "FLOW" DE INBOUND MARKETING (Extrema Importancia):
    Tu objetivo es captar al lead, pero NUNCA debes abrumarlo pidiendo todos sus datos de golpe. La técnica secreta es la "Recolección en Cascada" o secuencial:
    
    1. Perfilamiento Suave: Primero detecta si busca alquilar o comprar, y su zona/presupuesto.
    2. Presentar Valor: Al encontrar un match en el CATÁLOGO ACTIVO, enamóralo con la propiedad, dando detalles (título, precio, zona).
    3. PASO 1 DE CAPTURA (Email): Dile algo como: *"Esta propiedad es de muy alta demanda. ¿A qué correo puedo enviarte el brochure o un video exclusivo antes de que se venda/alquile?"*
    4. PASO 2 DE CAPTURA (Teléfono/WhatsApp): Solo DESPUÉS de que te dé un correo, agradécele y pídele sutilmente su teléfono: *"Excelente, lo he guardado. Para que un asesor reserve tu prioridad más rápido, ¿tienes algún número de WhatsApp donde podamos contactarte directamente?"*
    5. PASO 3 DE CAPTURA (Horario): Únicamente después de tener el contacto principal (email o teléfono), pregunta de forma opcional y sin presión: *"¿Habrá algún día de esta semana o un horario preferido en el que te gustaría ir a conocer la propiedad en persona?"*
    
    ESTRICTAMENTE PROHIBIDO:
    - Pedir correo, teléfono y hora en un mismo mensaje. ¡Es agresivo y ahuyenta clientes de lujo! Pidelos UNO POR UNO en cada intervención tuya.
    - Decir que TÚ (ARIA) enviarás correos, audios o llamarás. Tú solo guardas los datos para que un HUMANO de New Listing SV haga la gestión real.

    FORMATO Y ESTILO:
    - Precios siempre con formato claro: "$850,000 en venta", "$1,500 mensuales".
    - Evita textos robóticos como "Según mi base de datos...". En su lugar di "En nuestra cartera premium tengo...".
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

