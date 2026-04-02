import { prisma } from '../models';
import bcrypt from 'bcrypt';

export class UserService {
  async getAllUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateUserRole(id: string, role: 'ADMIN' | 'AGENT' | 'CLIENT') {
    // If role becomes AGENT, ensure agent profile exists
    if (role === 'AGENT') {
      const existingAgent = await prisma.agent.findUnique({ where: { userId: id } });
      if (!existingAgent) {
        const user = await prisma.user.findUnique({ where: { id } });
        if (user) {
          await prisma.agent.create({
            data: { userId: id, email: user.email, name: user.email.split('@')[0] }
          });
        }
      }
    }
    return prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, role: true }
    });
  }

  async resetPassword(id: string, newPasswordRaw: string) {
    const newPassword = newPasswordRaw.trim();
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
      select: { id: true, email: true }
    });
  }

  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('User not found');

    const agent = await prisma.agent.findUnique({ where: { userId: id } });
    
    // Deal with Agent properties and leads
    if (agent) {
      await prisma.property.updateMany({
        where: { agentId: agent.id },
        data: { agentId: null }
      });
      await prisma.lead.updateMany({
        where: { agentId: agent.id },
        data: { agentId: null }
      });
      await prisma.agent.delete({ where: { id: agent.id } });
    }

    // Deal with client/lead profile
    const lead = await prisma.lead.findUnique({ where: { userId: id } });
    if (lead) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { userId: null }
      });
    }

    await prisma.user.delete({ where: { id } });
    return true;
  }
}

export const userService = new UserService();
