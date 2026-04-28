import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function verifyDatabase() {
  try {
    await prisma.$connect();
    // Deep check to ensure migrations have actually run
    await prisma.user.count();
    console.log('Database connected and tables verified');
  } catch (err) {
    console.error('Startup failed: Database not ready or migrations missing', err);
    process.exit(1);
  }
}
