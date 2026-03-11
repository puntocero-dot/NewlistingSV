import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import { prisma } from '../models';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

export class EmbeddingService {
  private embeddingModel = 'text-embedding-004';

  async generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GOOGLE_AI_API_KEY || '';
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
        throw new Error('Google AI API Key not configured');
    }
    const model = genAI.getGenerativeModel({ model: this.embeddingModel });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async createPropertyEmbedding(propertyId: string) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (!property) throw new Error('Property not found');

    const textToEmbed = `
      Title: ${property.title}
      Description: ${property.description}
      Mode: ${property.mode}
      Category: ${property.category}
      Zone: ${property.zone}
      Features: ${property.features.join(', ')}
    `;

    const embedding = await this.generateEmbedding(textToEmbed);
    
    // We must use raw SQL to update the pgvector column
    await prisma.$executeRaw`
        UPDATE "Property" 
        SET "embedding" = ${embedding}::vector 
        WHERE id = ${propertyId}
    `;
    return true;
  }

  async searchSimilarProperties(queryText: string, limit: number = 3) {
    const queryEmbedding = await this.generateEmbedding(queryText);
    
    // Perform cosine similarity search using pgvector '<=>' operator
    const results = await prisma.$queryRaw`
        SELECT id, title, zone, price, mode, category, images,
               1 - ("embedding" <=> ${queryEmbedding}::vector) as similarity
        FROM "Property"
        WHERE "embedding" IS NOT NULL
        ORDER BY "embedding" <=> ${queryEmbedding}::vector
        LIMIT ${limit}
    `;
    
    return results;
  }
}

export const embeddingService = new EmbeddingService();
