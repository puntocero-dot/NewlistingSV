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

      // Lead management logic
      const emailMatch = message.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
      const phoneMatch = message.match(/(\+?\d{8,15})/);
      const dateContext = message.match(/(lunes|martes|miércoles|jueves|viernes|sábado|domingo|mañana|hoy|tarde|mañana|pm|am|\d{1,2}:\d{2})/i);
      const visitDate = dateContext ? message.substring(message.indexOf(dateContext[0])).substring(0, 50) : null;
      
      let identifiedLead: any = null;
      let agentInfo = "";

      // Helper to generate a friendly Case ID: NL-XXXX
      const generateCaseId = () => `NL-${Math.floor(1000 + Math.random() * 9000)}`;

      if (emailMatch || phoneMatch || visitDate) {
        const leadEmail = emailMatch ? emailMatch[1] : null;
        const leadPhone = phoneMatch ? phoneMatch[1] : null;
        
        try {
          const defaultAgent = await prisma.agent.findFirst();
          const leadUpdateData: any = {
            phone: leadPhone || undefined,
            preferences: visitDate ? { last_visit_request: visitDate } : undefined,
          };

          if (leadEmail) {
            const existing = await prisma.lead.findFirst({ 
              where: { email: leadEmail },
              include: { agent: true }
            });
            if (existing) {
              identifiedLead = await prisma.lead.update({ 
                where: { id: existing.id }, 
                data: leadUpdateData,
                include: { agent: true }
              });
            } else {
              identifiedLead = await prisma.lead.create({ 
                data: { 
                  email: leadEmail, 
                  phone: leadPhone, 
                  name: 'Lead from ARIA Chat', 
                  agentId: defaultAgent?.id,
                  caseId: generateCaseId(),
                  preferences: visitDate ? { last_visit_request: visitDate } : {}
                } as any,
                include: { agent: true }
              });
              emailService.sendClientConfirmation(leadEmail, visitDate || undefined);
            }
          } else if (leadPhone) {
             const existing = await prisma.lead.findFirst({ 
               where: { phone: leadPhone },
               include: { agent: true }
             });
             if (existing) {
               identifiedLead = existing;
               if (visitDate) identifiedLead = await prisma.lead.update({ 
                 where: { id: existing.id }, 
                 data: { preferences: { last_visit_request: visitDate } },
                 include: { agent: true }
               });
             } else {
                identifiedLead = await prisma.lead.create({ 
                 data: { 
                   phone: leadPhone, 
                   name: 'Lead from ARIA Chat', 
                   agentId: defaultAgent?.id,
                   caseId: generateCaseId(),
                   preferences: visitDate ? { last_visit_request: visitDate } : {}
                 } as any,
                 include: { agent: true }
               });
             }
          }

          if (identifiedLead?.agent) {
            agentInfo = identifiedLead.agent.name;
          } else if (defaultAgent) {
            agentInfo = defaultAgent.name;
          }

          // Notify agent if new info arrived
          if (identifiedLead && (leadPhone || visitDate) && identifiedLead.agent) {
             emailService.sendAgentNotification(identifiedLead.agent.email, { 
               email: identifiedLead.email || 'N/A', 
               phone: leadPhone || identifiedLead.phone || '', 
               date: visitDate || '' 
             });
          }
        } catch (dbErr) {
          app.log.warn('Could not save lead: ' + dbErr);
        }
      }

      const response = await aiService.generateResponseWithContext(
        message,
        history || [],
        properties,
        {
          caseId: identifiedLead?.caseId,
          agentName: agentInfo,
          origin: request.headers.origin || `http://${request.hostname}`
        }
      );
      return { response };
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
