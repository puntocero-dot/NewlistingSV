import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { aiService } from '../services/ai.service';
import { emailService } from '../services/email.service';
import { leadService } from '../services/lead.service';
import { prisma } from '../models';

const chatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000, 'Message too long'),
  history: z.array(z.any()).optional(),
});

export async function conversationRoutes(app: FastifyInstance) {
  // Strict rate limit: 20 requests per minute (AI endpoint is expensive)
  app.post('/chat', {
    config: {
      rateLimit: {
        max: 20,
        timeWindow: '1 minute',
      },
    },
  }, async (request, reply) => {
    const parsed = chatSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }
    const { message, history } = parsed.data;
    
    try {
      // 1. Smart Keyword Extraction for Filtering (Cost Optimization)
      const lowerMsg = message.toLowerCase();
      const zones = ['escalón', 'santa tecla', 'antiguo cuscatlán', 'nuevo cuscatlán', 'surf city', 'la libertad', 'san benito', 'merliot', 'toscana', 'madre selva'];
      const modes = ['venta', 'alquiler', 'comprar', 'rentar'];
      const categories = ['casa', 'apartamento', 'terreno', 'local', 'oficina', 'playa'];

      const detectedZone = zones.find(z => lowerMsg.includes(z));
      let detectedMode = modes.find(m => lowerMsg.includes(m));
      if (detectedMode === 'comprar') detectedMode = 'Venta';
      if (detectedMode === 'rentar') detectedMode = 'Alquiler';
      const detectedCategory = categories.find(c => lowerMsg.includes(c));

      // 2. Fetch properties with filters
      const properties = await prisma.property.findMany({
        where: { 
          status: 'AVAILABLE',
          zone: detectedZone ? { contains: detectedZone, mode: 'insensitive' } : undefined,
          mode: detectedMode ? { contains: detectedMode, mode: 'insensitive' } : undefined,
          category: detectedCategory ? { contains: detectedCategory, mode: 'insensitive' } : undefined,
        },
        orderBy: { createdAt: 'desc' },
        take: 12, // Reduced from 50 to 12 for token optimization
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
        try {
          const leadEmail = emailMatch ? emailMatch[1] : null;
          const leadPhone = phoneMatch ? phoneMatch[1] : null;

          // Smart Assignment Logic
          const assignedAgentId = await leadService.getSmartAgentAssignment(leadEmail || undefined, leadPhone || undefined);

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
                  agentId: assignedAgentId,
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
                   agentId: assignedAgentId,
                   caseId: generateCaseId(),
                   preferences: visitDate ? { last_visit_request: visitDate } : {}
                 } as any,
                 include: { agent: true }
               });
             }
          }

          if (identifiedLead?.agent) {
            agentInfo = identifiedLead.agent.name;
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
          origin: request.headers.origin || `http://${request.hostname}`,
          userId: (request as any).user?.id // Log token usage for authenticated users
        }
      );
      return { response };
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });

  app.get('/', async (request, reply) => {
    return { message: 'Conversation routes working' };
  });
}
