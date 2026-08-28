/**
 * Erro de dominio: a mensagem e sempre segura para exibir ao usuario final.
 * Qualquer outro erro que vaze e tratado como "erro inesperado".
 */
export class AppError extends Error {
  constructor(message, { code = 'APP_ERROR', details = null } = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, { code: 'VALIDATION_ERROR', details });
    this.name = 'ValidationError';
  }
}

export class PermissionError extends AppError {
  constructor(message = 'Voce nao tem permissao para executar esta acao.') {
    super(message, { code: 'PERMISSION_ERROR' });
    this.name = 'PermissionError';
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Recurso nao encontrado.') {
    super(message, { code: 'NOT_FOUND' });
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message) {
    super(message, { code: 'CONFLICT' });
    this.name = 'ConflictError';
  }
}
