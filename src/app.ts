import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { propertyRoutes } from './routes/properties';
import { conversationRoutes } from './routes/conversations';
import { agentRoutes } from './routes/agents';
import { appointmentRoutes } from './routes/appointments';
import { uploadRoutes } from './routes/uploads';
import { leadsRoutes } from './routes/leads';
import { usersRoutes } from './routes/users';
import { adminRoutes } from './routes/admin';

import { authRoutes } from './routes/auth';
import authPlugin from './plugins/auth';

const buildApp = (): FastifyInstance => {
  const app = Fastify({
    logger: true,
    bodyLimit: 10485760 // 10MB
  });

  // Security headers
  app.register(helmet, {
    contentSecurityPolicy: false, // Disabled to allow static frontend assets
  });

  // CORS — restrict to known frontend origin in production
  app.register(cors, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Global rate limiting: 100 requests per minute per IP
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: () => ({
      error: 'Too many requests, please try again later',
    }),
  });

  app.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
  });

  // Register Auth Plugin (MUST be before routes)
  app.register(authPlugin);

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Routes
  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(usersRoutes, { prefix: '/api/users' });
  app.register(propertyRoutes, { prefix: '/api/properties' });
  app.register(conversationRoutes, { prefix: '/api/conversations' });
  app.register(agentRoutes, { prefix: '/api/agents' });
  app.register(appointmentRoutes, { prefix: '/api/appointments' });
  app.register(uploadRoutes, { prefix: '/api/uploads' });
  app.register(leadsRoutes, { prefix: '/api/leads' });
  app.register(adminRoutes, { prefix: '/api/admin' });

  return app;
};

export { buildApp };
