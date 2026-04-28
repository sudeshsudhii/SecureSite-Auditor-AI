import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function verifyDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }
}
