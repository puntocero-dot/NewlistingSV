import { FastifyInstance } from 'fastify';
import { prisma } from '../models';

export async function leadsRoutes(app: FastifyInstance) {
  // Solo los agentes o admins pueden ver leads
  app.get('/', { preHandler: [app.requireAgent] }, async (request, reply) => {
    try {
      const user = (request as any).user;
      
      // Si es admin, ve todos. Si es agente, ve solo los suyos o los no asignados.
      // Por simplicidad en este MVP, mostraremos todos los leads.
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
    try {
      const { id } = request.params as { id: string };
      const { status, appointmentDate, notes } = request.body as { 
        status?: any, 
        appointmentDate?: string, 
        notes?: string 
      };

      const updated = await prisma.lead.update({
        where: { id },
        data: {
          status: status || undefined,
          appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
          notes: notes !== undefined ? notes : undefined
        } as any
      });

      return updated;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to update lead' });
    }
  });
}
