import { FastifyInstance } from 'fastify';
import { agentService } from '../services/agent.service';

export async function agentRoutes(app: FastifyInstance) {
  // Public: listing agents is fine for prospects browsing the site
  app.get('/', async (request, reply) => {
    return await agentService.getAllAgents();
  });

  // Admin only: creating agents is an administrative operation
  app.post('/', { preValidation: [app.requireAdmin] }, async (request, reply) => {
    const agent = await agentService.createAgent(request.body);
    return agent;
  });

  // Agent or Admin: uploading property images requires authentication
  app.post('/upload', { preValidation: [app.requireAgent] }, async (request, reply) => {
    const { agentId, image, mimeType } = request.body as any;
    if (!image) return reply.status(400).send({ error: 'Image required' });

    const buffer = Buffer.from(image, 'base64');
    return await agentService.processPropertyUpload(agentId, buffer, mimeType);
  });
}
