export const WarStatus = Object.freeze({
  /** Desafio enviado, aguardando o adversário. */
  PENDING: 'PENDING',
  /** Aceito e em andamento. */
  ACTIVE: 'ACTIVE',
  FINISHED: 'FINISHED',
  DECLINED: 'DECLINED',
  CANCELLED: 'CANCELLED',
});

export const WAR_STATUS_LABEL = Object.freeze({
  PENDING: '⏳ Aguardando resposta',
  ACTIVE: '⚔️ Em andamento',
  FINISHED: '🏁 Encerrada',
  DECLINED: '🚫 Recusada',
  CANCELLED: '↩️ Cancelada',
});
