import { FastifyInstance } from 'fastify';
import { aiService } from '../services/ai.service';
import { emailService } from '../services/email.service';
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
      // Rough extraction for common date/time mentions
      const dateContext = message.match(/(lunes|martes|miércoles|jueves|viernes|sábado|domingo|mañana|hoy|tarde|mañana|pm|am|\d{1,2}:\d{2})/i);
      const visitDate = dateContext ? message.substring(message.indexOf(dateContext[0])).substring(0, 50) : null;
      
      if (emailMatch || phoneMatch || visitDate) {
        const leadEmail = emailMatch ? emailMatch[1] : null;
        const leadPhone = phoneMatch ? phoneMatch[1] : null;
        let isNewLeadForEmail = false;
        
        try {
          // Look for an agent in the conversation context (if we have property ownership info)
          // For now, get the first agent if not found
          const defaultAgent = await prisma.agent.findFirst();

          const leadUpdateData = {
            phone: leadPhone || undefined,
            preferences: visitDate ? { last_visit_request: visitDate } : undefined,
          };

          if (leadEmail) {
            const existing = await prisma.lead.findFirst({ where: { email: leadEmail } });
            if (existing) {
              await prisma.lead.update({ 
                where: { id: existing.id }, 
                data: leadUpdateData 
              });
              // Notify agent if news info arrived
              if (defaultAgent && (leadPhone || visitDate)) {
                emailService.sendAgentNotification(defaultAgent.email, { email: leadEmail, phone: leadPhone || existing.phone || '', date: visitDate || '' });
              }
            } else {
              await prisma.lead.create({ 
                data: { 
                  email: leadEmail, 
                  phone: leadPhone, 
                  name: 'Lead from ARIA Chat', 
                  agentId: defaultAgent?.id,
                  preferences: visitDate ? { last_visit_request: visitDate } : {}
                } as any
              });
              isNewLeadForEmail = true;
            }
          } else if (leadPhone) {
             const existing = await prisma.lead.findFirst({ where: { phone: leadPhone } });
             if (existing) {
               if (visitDate) await prisma.lead.update({ where: { id: existing.id }, data: { preferences: { last_visit_request: visitDate } } });
             } else {
               await prisma.lead.create({ 
                 data: { 
                   phone: leadPhone, 
                   name: 'Lead from ARIA Chat', 
                   agentId: defaultAgent?.id,
                   preferences: visitDate ? { last_visit_request: visitDate } : {}
                 } as any
               });
             }
          } else if (visitDate) {
            // If they only gave a date and we can't tie it to a lead yet, we skip for now 
            // but in a more complex app we'd tie it to the session.
          }

          // Trigger Emails for completely new email leads
          if (isNewLeadForEmail && leadEmail) {
            emailService.sendClientConfirmation(leadEmail, visitDate || undefined);
            if (defaultAgent) {
              emailService.sendAgentNotification(defaultAgent.email, { email: leadEmail, phone: leadPhone || '', date: visitDate || '' });
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
