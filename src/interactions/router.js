import { parseCustomId } from '../models/customIds.js';
import createGuildButton from './buttons/createGuildButton.js';
import confirmCreateButton from './buttons/confirmCreateButton.js';
import cancelButton from './buttons/cancelButton.js';
import { acceptInviteButton, declineInviteButton } from './buttons/inviteButtons.js';
import { deleteGuildButton, leaveGuildButton } from './buttons/dangerButtons.js';
import createGuildModal from './modals/createGuildModal.js';

const handlers = [
  createGuildButton,
  confirmCreateButton,
  cancelButton,
  acceptInviteButton,
  declineInviteButton,
  deleteGuildButton,
  leaveGuildButton,
  createGuildModal,
];

/** customId base -> handler */
const registry = new Map(handlers.map((handler) => [handler.customId, handler]));

export function resolveInteractionHandler(customId) {
  const { base, args } = parseCustomId(customId);
  const handler = registry.get(base);
  return handler ? { handler, args } : null;
}

export default resolveInteractionHandler;
