import { randomBytes } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'

export async function saveBase64Image(base64: string, docId: string): Promise<string> {
  const match = base64.match(/^data:image\/(png|jpg|jpeg|webp);base64,(.+)$/)
  if (!match) throw new Error('Invalid image format')
  const ext = match[1] === 'jpg' ? 'jpg' : match[1]
  const data = Buffer.from(match[2], 'base64')
  const name = `proc-${docId.slice(0, 8)}-${randomBytes(4).toString('hex')}.${ext}`
  const dir = join(process.cwd(), 'public', 'uploads', 'procedures')
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, name), data)
  return `/uploads/procedures/${name}`
}
