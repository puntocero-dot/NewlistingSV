import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { userService } from '../services/user.service';

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'AGENT', 'CLIENT'])
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters')
});

export async function usersRoutes(app: FastifyInstance) {
  // All user management routes require ADMIN privileges
  app.addHook('preValidation', app.requireAdmin);

  app.get('/', async (request, reply) => {
    try {
      const users = await userService.getAllUsers();
      return users;
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to retrieve users' });
    }
  });

  app.put('/:id/role', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = updateRoleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }
      const updatedUser = await userService.updateUserRole(id, parsed.data.role);
      return updatedUser;
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to update user role' });
    }
  });

  app.put('/:id/password', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const parsed = resetPasswordSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.issues[0].message });
      }
      const updatedUser = await userService.resetPassword(id, parsed.data.password);
      return updatedUser;
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to reset user password' });
    }
  });

  app.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await userService.deleteUser(id);
      return { success: true };
    } catch (error: any) {
      app.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete user' });
    }
  });
}
