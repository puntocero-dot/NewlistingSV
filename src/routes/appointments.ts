import { FastifyInstance } from 'fastify';
import { appointmentService } from '../services/appointment.service';

export async function appointmentRoutes(app: FastifyInstance) {
  // Public: prospects can check agent availability without logging in
  app.get('/slots/:agentId', async (request, reply) => {
    const { agentId } = request.params as { agentId: string };
    return await appointmentService.getAvailableSlots(agentId);
  });

  // Authenticated: scheduling an appointment requires a valid session
  app.post('/schedule', { preValidation: [app.authenticate] }, async (request, reply) => {
    const { leadId, agentId, slot } = request.body as any;
    return await appointmentService.scheduleAppointment(leadId, agentId, slot);
  });
}
