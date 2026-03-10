import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding data...');

  // Create Agents
  const agent1 = await prisma.agent.create({
    data: {
      name: 'Carlos Rodriguez',
      email: 'carlos@antigravity.sv',
      phone: '+503 7000-0001',
      zone: 'San Salvador',
    },
  });

  const agent2 = await prisma.agent.create({
    data: {
      name: 'Ana Maria Lopez',
      email: 'ana@antigravity.sv',
      phone: '+503 7000-0002',
      zone: 'La Libertad',
    },
  });

  // Create Properties
  await prisma.property.create({
    data: {
      title: 'Villa Maritima Luxury',
      description: 'Espectacular villa con vista al mar y piscina infinita en Surf City.',
      price: 850000,
      mode: 'Venta',
      category: 'Playa',
      zone: 'La Libertad',
      surface: 450,
      features: ['Piscina', 'Vista al mar', 'Gimnasio'],
    },
  });

  await prisma.property.create({
    data: {
      title: 'Apartamento Penthouse Torre Elites',
      description: 'Lujo en el corazón de San Benito con acabados de mármol.',
      price: 4200,
      mode: 'Alquiler',
      category: 'Residencial',
      zone: 'San Salvador',
      surface: 200,
      features: ['Seguridad 24/7', 'Terraza', 'Smart Home'],
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
