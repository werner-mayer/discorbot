import config from '../config/index.js';
import { ValidationError } from './errors.js';
import { hasMixedScripts, normalize } from './text.js';

// Bloqueia caracteres usados para spoof/markdown e mencoes.
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} '._-]*$/u;
const TAG_PATTERN = /^[\p{L}\p{N}]+$/u;
// Bloqueadas como palavra inteira em qualquer posicao ("Admin Team" cai aqui).
const FORBIDDEN_WORDS = [
  'everyone', 'here', 'admin', 'administrador', 'administradores', 'admins', 'adm', 'moderador', 'moderadores', 'mod', 'mods',
  'staff', 'owner', 'dono', 'suporte', 'support', 'bot',
];

function hasForbiddenWord(value) {
  return normalize(value)
    .split(/[^a-z0-9]+/)
    .some((word) => FORBIDDEN_WORDS.includes(word));
}

export function validateGuildName(input) {
  const name = String(input ?? '').trim().replace(/\s+/g, ' ');
  const { nameMinLength, nameMaxLength } = config.guild;

  if (name.length < nameMinLength || name.length > nameMaxLength) {
    throw new ValidationError(
      `O nome do clã deve ter entre ${nameMinLength} e ${nameMaxLength} caracteres.`,
    );
  }
  if (!NAME_PATTERN.test(name)) {
    throw new ValidationError(
      'O nome do clã contém caracteres inválidos. Use apenas letras, números, espaços e `-` `_` `.`',
    );
  }
  if (hasMixedScripts(name)) {
    throw new ValidationError('O nome do clã mistura alfabetos diferentes (ex.: letras cirílicas com latinas).');
  }
  if (hasForbiddenWord(name)) {
    throw new ValidationError('Esse nome de clã não é permitido (contém uma palavra reservada).');
  }
  return name;
}

export function validateGuildTag(input) {
  const tag = String(input ?? '').trim().replace(/^\[|\]$/g, '').trim().toUpperCase();
  const { tagMinLength, tagMaxLength } = config.guild;

  if (tag.length < tagMinLength || tag.length > tagMaxLength) {
    throw new ValidationError(
      `A TAG deve ter entre ${tagMinLength} e ${tagMaxLength} caracteres.`,
    );
  }
  if (!TAG_PATTERN.test(tag)) {
    throw new ValidationError('A TAG deve conter apenas letras e números (sem espaços ou símbolos).');
  }
  if (hasMixedScripts(tag) || hasForbiddenWord(tag)) {
    throw new ValidationError('Essa TAG não é permitida.');
  }
  return tag;
}
