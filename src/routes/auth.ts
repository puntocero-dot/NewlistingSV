import { FastifyInstance } from 'fastify';
import { authService } from '../services/auth.service';

export async function authRoutes(app: FastifyInstance) {
  
  // Seed the admin on route load
  authService.createInitialAdmin().catch(console.error);

  app.post('/register', async (request, reply) => {
    try {
      const user = await authService.register(request.body);
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
      return { token, user: { id: user.id, email: user.email, role: user.role } };
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  app.post('/login', async (request, reply) => {
    try {
      const { email, password } = request.body as any;
      const user = await authService.login(email, password);
      const token = app.jwt.sign({ id: user.id, email: user.email, role: user.role });
      return { token, user: { id: user.id, email: user.email, role: user.role } };
    } catch (error: any) {
      return reply.status(401).send({ error: error.message });
    }
  });

  app.get('/me', { preValidation: [app.authenticate] }, async (request, reply) => {
    return request.user;
  });
}
