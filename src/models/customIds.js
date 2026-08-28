/**
 * Convencao de customId das interacoes:  guild:<acao>[:<arg>...]
 * O router (src/interactions/router.js) usa apenas o prefixo `guild:<acao>`
 * para escolher o handler, e entrega o resto como argumentos.
 */
export const NAMESPACE = 'guild';

export const CustomId = Object.freeze({
  CREATE_BUTTON: 'guild:create',
  CREATE_MODAL: 'guild:create-modal',
  CONFIRM_CREATE: 'guild:confirm',
  CANCEL_CREATE: 'guild:cancel',
  INVITE_ACCEPT: 'guild:invite-accept',
  INVITE_DECLINE: 'guild:invite-decline',
  LEAVE_CONFIRM: 'guild:leave-confirm',
  DELETE_CONFIRM: 'guild:delete-confirm',
  EDIT_MODAL: 'guild:edit-modal',
  SETTINGS_SELECT: 'guild:settings-policy',
  EMOJI_CREATE: 'guild:emoji-create',
  EMOJI_SETTINGS: 'guild:emoji-settings',
  JOIN_APPROVE: 'guild:join-approve',
  JOIN_REJECT: 'guild:join-reject',
  WAR_ACCEPT: 'guild:war-accept',
  WAR_DECLINE: 'guild:war-decline',
});

export function buildCustomId(base, ...args) {
  return [base, ...args].join(':');
}

export function parseCustomId(customId) {
  const parts = customId.split(':');
  // guild:invite-accept:<id>  ->  base "guild:invite-accept", args ["<id>"]
  return {
    namespace: parts[0],
    base: parts.slice(0, 2).join(':'),
    args: parts.slice(2),
  };
}
