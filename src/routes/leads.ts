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
      const leads = await prisma.lead.findMany({
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
      const { status, appointmentDate, notes } = parsed.data;

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
