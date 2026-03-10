import { FastifyInstance } from 'fastify';
import { agentService } from '../services/agent.service';

export async function agentRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    return await agentService.getAllAgents();
  });

  app.post('/', async (request, reply) => {
    const agent = await agentService.createAgent(request.body);
    return agent;
  });

  app.post('/upload', async (request, reply) => {
    // Simulation of property upload from agent
    const { agentId, image, mimeType } = request.body as any;
    if (!image) return reply.status(400).send({ error: 'Image required' });
    
    const buffer = Buffer.from(image, 'base64');
    return await agentService.processPropertyUpload(agentId, buffer, mimeType);
  });
}

