import config from '../config/index.js';
import { ValidationError } from './errors.js';
import { normalize } from './text.js';

// Bloqueia caracteres usados para spoof/markdown e mencoes.
const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} '._-]*$/u;
const TAG_PATTERN = /^[\p{L}\p{N}]+$/u;
const FORBIDDEN_WORDS = ['everyone', 'here', 'admin', 'administrador', 'moderador'];

export function validateGuildName(input) {
  const name = String(input ?? '').trim().replace(/\s+/g, ' ');
  const { nameMinLength, nameMaxLength } = config.guild;

  if (name.length < nameMinLength || name.length > nameMaxLength) {
    throw new ValidationError(
      `O nome da guilda deve ter entre ${nameMinLength} e ${nameMaxLength} caracteres.`,
    );
  }
  if (!NAME_PATTERN.test(name)) {
    throw new ValidationError(
      'O nome da guilda contém caracteres inválidos. Use apenas letras, números, espaços e `-` `_` `.`',
    );
  }
  if (FORBIDDEN_WORDS.includes(normalize(name))) {
    throw new ValidationError('Esse nome de guilda não é permitido.');
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
  if (FORBIDDEN_WORDS.includes(normalize(tag))) {
    throw new ValidationError('Essa TAG não é permitida.');
  }
  return tag;
}
