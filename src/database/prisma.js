import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('database');

export const prisma = new PrismaClient();

export async function connectDatabase() {
  await prisma.$connect();
  logger.info('Conectado ao banco de dados.');
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Conexão com o banco encerrada.');
}

export default prisma;
