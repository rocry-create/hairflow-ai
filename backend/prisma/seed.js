const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hairflow.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456';
  const adminCompany = process.env.ADMIN_COMPANY || 'HairFlow AI';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        name: adminCompany,
        role: 'ADMIN',
      },
    });
    console.log('Usuário admin criado: ' + adminEmail);
  } else {
    console.log('Usuário admin já existe, pulando criação.');
  }

  const serviceCount = await prisma.service.count();
  if (serviceCount === 0) {
    await prisma.service.createMany({
      data: [
        { name: 'Corte', durationMinutes: 60, price: 80 },
        { name: 'Escova', durationMinutes: 40, price: 60 },
        { name: 'Hidratação', durationMinutes: 90, price: 120 },
        { name: 'Mega Hair', durationMinutes: 240, price: 1800 },
        { name: 'Progressiva', durationMinutes: 180, price: 350 },
        { name: 'Coloração', durationMinutes: 150, price: 250 },
      ],
    });
    console.log('Serviços de exemplo criados.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
