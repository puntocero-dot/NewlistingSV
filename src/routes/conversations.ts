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

      // Extract email or phone from user message and save as Lead silently
      const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      const phoneMatch = message.match(/(\+?\d{8,15})/);
      
      if (emailMatch || phoneMatch) {
        const leadEmail = emailMatch ? emailMatch[1] : null;
        const leadPhone = phoneMatch ? phoneMatch[1] : null;
        
        try {
          if (leadEmail) {
            const existing = await prisma.lead.findFirst({ where: { email: leadEmail } });
            if (existing) {
              if (leadPhone) await prisma.lead.update({ where: { id: existing.id }, data: { phone: leadPhone } });
            } else {
              await prisma.lead.create({ data: { email: leadEmail, phone: leadPhone, name: 'Lead from ARIA Chat' } });
            }
          } else if (leadPhone) {
             const existing = await prisma.lead.findFirst({ where: { phone: leadPhone } });
             if (!existing) {
               await prisma.lead.create({ data: { phone: leadPhone, name: 'Lead from ARIA Chat' } });
             }
          }
        } catch (dbErr) {
          app.log.warn('Could not save lead: ' + dbErr);
        }
      }

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
