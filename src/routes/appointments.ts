import { FastifyInstance } from 'fastify';
import { appointmentService } from '../services/appointment.service';

export async function appointmentRoutes(app: FastifyInstance) {
  app.get('/slots/:agentId', async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    return await appointmentService.getAvailableSlots(agentId);
  });

  app.post('/schedule', async (request, reply) => {
    const { leadId, agentId, slot } = request.body as any;
    return await appointmentService.scheduleAppointment(leadId, agentId, slot);
  });
}

