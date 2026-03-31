import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth.service';

const registerSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).optional(),
  role: z.enum(['CLIENT', 'AGENT', 'ADMIN']).optional(),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export async function authRoutes(app: FastifyInstance) {

  // Seed the admin on route load (uses env vars, no hardcoded credentials)
  authService.createInitialAdmin().catch((err: Error) => {
    app.log.warn('Initial admin creation skipped: ' + err.message);
  });

  // Strict rate limit: 10 requests per minute on auth endpoints
  const authRateLimit = {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute',
      },
    },
  };

  app.post('/register', authRateLimit, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }
    try {
      const user = await authService.register(parsed.data);
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
      return { token, user: { id: user.id, email: user.email, role: user.role } };
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  app.post('/login', authRateLimit, async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.issues[0].message });
    }
    try {
      const { email, password } = parsed.data;
      const user = await authService.login(email, password);
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
      return { token, user: { id: user.id, email: user.email, role: user.role } };
    } catch (error: any) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
  });

  app.get('/me', { preValidation: [app.authenticate] }, async (request, reply) => {
    return request.user;
  });
}
