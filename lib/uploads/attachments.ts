import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

/**
 * Infraestrutura compartilhada de anexos.
 *
 * Extraída da rota de anexos de Anotações para ser reutilizada por outros
 * módulos (Pautas de Reuniões) sem duplicar regras de segurança. As políticas
 * — MIME permitido, limite de tamanho, magic bytes e nomeação — são as mesmas.
 */

export const ALLOWED_MIME = [
  'image/png', 'image/jpeg', 'image/webp', 'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword',
  'application/vnd.ms-excel',
]

export const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export const EXT_MAP: Record<string, string> = {
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/msword': 'doc',
  'application/vnd.ms-excel': 'xls',
}

export function isImageMime(mime: string) {
  return mime.startsWith('image/')
}

/** Confere a assinatura binária do arquivo contra o MIME declarado. */
export function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/png')
    return buffer[0] === 0x89 && buffer[1] === 0x50
  if (mimeType === 'image/jpeg')
    return buffer[0] === 0xff && buffer[1] === 0xd8
  if (mimeType === 'image/webp')
    return buffer[8] === 0x57 && buffer[9] === 0x45
  if (mimeType === 'image/gif')
    return buffer[0] === 0x47 && buffer[1] === 0x49
  if (mimeType === 'application/pdf')
    return buffer[0] === 0x25 && buffer[1] === 0x50
  return true // DOCX/XLSX seguem sem checagem de assinatura
}

export interface ValidatedUpload {
  buffer: Buffer
  fileName: string
  fileType: string
  fileSize: number
}

/**
 * Valida o File recebido do FormData aplicando todas as políticas.
 * Retorna { error } com a mensagem pronta, ou { upload } quando aprovado.
 */
export async function validateUpload(
  file: File | null,
): Promise<{ error: string } | { upload: ValidatedUpload }> {
  if (!file || file.size === 0) return { error: 'Nenhum arquivo enviado.' }
  if (!ALLOWED_MIME.includes(file.type)) return { error: 'Formato não permitido.' }
  if (file.size > MAX_SIZE) return { error: 'Arquivo excede 20 MB.' }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!validateMagicBytes(buffer, file.type)) return { error: 'Arquivo inválido.' }

  return {
    upload: {
      buffer,
      fileName: file.name || 'arquivo',
      fileType: file.type,
      fileSize: file.size,
    },
  }
}

/**
 * Grava o arquivo em public/uploads/<folder> com nome aleatório e seguro.
 * Devolve o caminho público a ser persistido.
 */
export async function saveUpload(
  upload: ValidatedUpload,
  folder: string,
  prefix: string,
): Promise<{ filePath: string; safeName: string }> {
  const ext      = EXT_MAP[upload.fileType] ?? 'bin'
  const rand     = randomBytes(6).toString('hex')
  const safeName = `${prefix}-${rand}.${ext}`

  const uploadDir = join(process.cwd(), 'public', 'uploads', folder)
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, safeName), upload.buffer)

  return { filePath: `/uploads/${folder}/${safeName}`, safeName }
}
