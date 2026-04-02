import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../models';

const LEAD_STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST', 'FUTURE'] as const;

const updateLeadSchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  appointmentDate: z.string().datetime({ offset: true }).optional(),
  notes: z.string().max(2000).optional(),
});

export async function leadsRoutes(app: FastifyInstance) {
  // Solo los agentes o admins pueden ver leads
  app.get('/', { preHandler: [app.requireAgent] }, async (request, reply) => {
    try {
      const { id: userId, role } = request.user;
      let whereFilter: any = {};

      if (role === 'AGENT') {
        const agent = await prisma.agent.findUnique({ where: { userId } });
        if (!agent) return reply.status(403).send({ error: 'Agent profile not found' });
        whereFilter.agentId = agent.id;
      }

      const leads = await prisma.lead.findMany({
        where: whereFilter,
        orderBy: { createdAt: 'desc' },
      });
      return leads;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch leads' });
    }
  });

  // Actualizar estado o datos de un lead
  app.patch('/:id', { preHandler: [app.requireAgent] }, async (request, reply) => {
    const parsed = updateLeadSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }
    try {
      const { id } = request.params as { id: string };
      const { id: userId, role } = request.user;
      const { status, appointmentDate, notes } = parsed.data;

      // Ownership check for agents
      if (role === 'AGENT') {
        const agent = await prisma.agent.findUnique({ where: { userId } });
        const lead = await prisma.lead.findUnique({ where: { id } });
        if (!agent || !lead || lead.agentId !== agent.id) {
          return reply.status(403).send({ error: 'Access denied: You do not own this lead' });
        }
      }

      const updated = await prisma.lead.update({
        where: { id },
        data: {
          status: status || undefined,
          appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
          notes: notes !== undefined ? notes : undefined,
        } as any,
      });

      return updated;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to update lead' });
    }
  });
}
