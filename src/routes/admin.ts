import { FastifyInstance } from 'fastify';
import { usageService } from '../services/usage.service';
import { prisma } from '../models';

export async function adminRoutes(app: FastifyInstance) {
  // Only ADMIN can access these stats
  app.get('/stats', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    try {
      const stats = await usageService.getGlobalStats();
      return stats;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch project stats' });
    }
  });

  // Global property list for Admin
  app.get('/properties', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    try {
      const properties = await prisma.property.findMany({
        include: { agent: true },
        orderBy: { createdAt: 'desc' }
      });
      return properties;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch properties' });
    }
  });

  // Detailed token logs
  app.get('/usage-logs', { preHandler: [app.requireAdmin] }, async (request, reply) => {
    try {
      const logs = await (prisma as any).usageLog.findMany({
        take: 50,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { email: true, role: true } } }
      });
      return logs;
    } catch (error) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch usage logs' });
    }
  });
}
