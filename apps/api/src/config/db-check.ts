import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function verifyDatabase() {
  try {
    await prisma.$connect();
    // Deep check to ensure migrations have actually run
    await prisma.user.count();
    console.log('Database connected and tables verified');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}
