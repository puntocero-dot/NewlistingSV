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
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required to create the initial admin');
    }

    const adminExists = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
    }
  }
}

export const authService = new AuthService();
