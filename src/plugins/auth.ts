import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdmin: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAgent: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: string, email: string, role: string };
    user: { id: string, email: string, role: string };
  }
}

export default fp(async function (fastify: FastifyInstance, opts: any) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  fastify.register(fastifyJwt, {
    secret: jwtSecret
  });

  fastify.decorate('authenticate', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
    } catch (err) {
      return reply.code(401).send({ error: 'Authentication required' });
    }
  });

  fastify.decorate('requireAdmin', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Requires ADMIN privileges.' });
      }
    } catch (err) {
      return reply.code(401).send({ error: 'Authentication required' });
    }
  });

  fastify.decorate('requireAgent', async function (request: FastifyRequest, reply: FastifyReply) {
    try {
      await request.jwtVerify();
      if (request.user.role !== 'AGENT' && request.user.role !== 'ADMIN') {
        return reply.code(403).send({ error: 'Requires AGENT privileges.' });
      }
    } catch (err) {
      return reply.code(401).send({ error: 'Authentication required' });
    }
  });
});
