export const JoinPolicy = Object.freeze({
  /** Só entra quem for convidado por um líder ou oficial. */
  INVITE_ONLY: 'INVITE_ONLY',
  /** Qualquer um pede entrada; líder/oficiais aprovam ou recusam. */
  APPROVAL: 'APPROVAL',
  /** Entrada imediata com /cla join. */
  OPEN: 'OPEN',
});

export const JOIN_POLICY_LABEL = Object.freeze({
  INVITE_ONLY: 'Somente convite',
  APPROVAL: 'Mediante aprovação',
  OPEN: 'Entrada livre',
});

export const JOIN_POLICY_DESCRIPTION = Object.freeze({
  INVITE_ONLY: 'Ninguém entra sem receber um convite do líder ou de um oficial.',
  APPROVAL: 'Qualquer um pede entrada com /cla join e a liderança decide.',
  OPEN: 'Qualquer um entra na hora com /cla join.',
});

export function isValidJoinPolicy(value) {
  return Object.prototype.hasOwnProperty.call(JoinPolicy, value);
}
