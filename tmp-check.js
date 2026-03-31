const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log(users.map(u => ({ email: u.email, role: u.role, passPrefix: u.password.substring(0, 10) })));
  await prisma.$disconnect();
}
check();
