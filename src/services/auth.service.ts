import { prisma } from '../models';
import bcrypt from 'bcrypt';

export class AuthService {
  async register(data: any) {
    const { email, password, role, name } = data;
    
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw new Error('User already exists');

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || 'CLIENT',
      }
    });

    if (user.role === 'AGENT') {
      await prisma.agent.create({
        data: { userId: user.id, email: user.email, name: name || 'Agent' }
      });
    }

    if (user.role === 'CLIENT') {
      await prisma.lead.create({
        data: { userId: user.id, email: user.email, name: name || 'Client' }
      });
    }

    return user;
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new Error('Invalid credentials');

    return user;
  }

  async createInitialAdmin() {
    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin2026', 10);
        await prisma.user.create({
            data: {
                email: 'admin@aria.com',
                password: hashedPassword,
                role: 'ADMIN'
            }
        });
        console.log('Initial ADMIN created: admin@aria.com / admin2026');
    }
  }
}

export const authService = new AuthService();
