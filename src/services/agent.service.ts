import { prisma } from '../models';
import { aiService } from './ai.service';

export class AgentService {
  async getAllAgents() {
    return await prisma.agent.findMany();
  }

  async getAgentById(id: string) {
    return await prisma.agent.findUnique({
      where: { id },
    });
  }

  async createAgent(data: any) {
    return await prisma.agent.create({
      data,
    });
  }

  async processPropertyUpload(agentId: string, imageBuffer: Buffer, mimeType: string) {
    // Module 3: Seller-Ease logic
    // 1. Image QA (Basic check)
    // 2. Auto Copywriting
    // 3. EXIF Data (placeholder/logic)
    
    const analysis = await aiService.analyzeImage(
      imageBuffer, 
      mimeType, 
      "Analiza esta propiedad de lujo. Genera una descripción de venta persuasiva (3 versiones: corta, media, larga) y destaca 3 elementos diferenciadores. Sugiere un precio si es posible."
    );

    return {
      agentId,
      analysis,
      status: 'processed'
    };
  }
}

export const agentService = new AgentService();
