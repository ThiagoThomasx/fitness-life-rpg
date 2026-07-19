// Mensagens de erro em pt-BR para fotos de progresso — usadas pela UI de
// upload/galeria. Mantidas separadas dos módulos de domínio para não
// misturar lógica de validação/storage com apresentação.

import type { BodyPhotoValidationError } from './body-progress-photo'
import type { PhotoDbError } from './body-progress-photo-db'

export function describePhotoValidationError(error: BodyPhotoValidationError): string {
  switch (error.type) {
    case 'invalid-mime':
      return 'Formato de imagem não suportado. Envie um arquivo JPEG, PNG ou WebP.'
    case 'empty-file':
      return 'O arquivo selecionado está vazio.'
    case 'too-large':
      return `A imagem é muito grande (máximo de ${Math.round(error.maxBytes / (1024 * 1024))} MB).`
    case 'invalid-dimensions':
      return 'Não foi possível ler as dimensões desta imagem.'
    case 'max-per-entry-exceeded':
      return `Este registro já tem o máximo de ${error.max} fotos.`
    case 'decode-failed':
      return 'Não foi possível processar esta imagem. Tente outro arquivo.'
    default:
      return 'Não foi possível processar esta foto.'
  }
}

export function describePhotoDbError(error: PhotoDbError | undefined): string {
  switch (error) {
    case 'indexeddb-unavailable':
      return 'Não foi possível acessar o armazenamento local de fotos neste navegador.'
    case 'quota-exceeded':
      return 'Não foi possível salvar a foto porque o armazenamento local está cheio.'
    case 'not-found':
      return 'Esta foto não foi encontrada.'
    default:
      return 'Não foi possível salvar a foto.'
  }
}
