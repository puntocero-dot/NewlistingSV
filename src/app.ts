import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { propertyRoutes } from './routes/properties';
import { conversationRoutes } from './routes/conversations';
import { agentRoutes } from './routes/agents';
import { appointmentRoutes } from './routes/appointments';

const buildApp = (): FastifyInstance => {
  const app = Fastify({
    logger: true,
  });

  // Middleware
  app.register(cors, {
    origin: true, // In production, specify your origin
  });

  app.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/public/', // optional: default '/'
  });

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Routes
  app.register(propertyRoutes, { prefix: '/api/properties' });
  app.register(conversationRoutes, { prefix: '/api/conversations' });
  app.register(agentRoutes, { prefix: '/api/agents' });
  app.register(appointmentRoutes, { prefix: '/api/appointments' });

  return app;
};

export { buildApp };
