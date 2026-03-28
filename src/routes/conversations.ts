import { FastifyInstance } from 'fastify';
import { aiService } from '../services/ai.service';
import { prisma } from '../models';

export async function conversationRoutes(app: FastifyInstance) {
  app.post('/chat', async (request, reply) => {
    const { message, history } = request.body as { message: string; history?: any[] };
    
    try {
      // Fetch live property catalog to give ARIA real context
      const properties = await prisma.property.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      const response = await aiService.generateResponseWithContext(
        message,
        history || [],
        properties,
      );
      return { response };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to generate response' });
    }
  });

  app.get('/', async (request, reply) => {
    return { message: 'Conversation routes working' };
  });
}
