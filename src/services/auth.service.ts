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

    let valid = false;

    // Check if the stored password is a bcrypt hash
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      valid = await bcrypt.compare(password, user.password);
    } else {
      // Legacy unhashed password
      valid = (password === user.password);

      // Upgrade to hashed password transparently
      if (valid) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
      }
    }

    if (!valid) throw new Error('Invalid credentials');

    return user;
  }

  async createInitialAdmin() {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@aria.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin12345!';

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          role: 'ADMIN'
        }
      });
    } else {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { password: hashedPassword, role: 'ADMIN' }
      });
    }
  }
}

export const authService = new AuthService();
