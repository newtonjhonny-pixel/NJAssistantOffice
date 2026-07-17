import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join, extname } from 'path'
import { randomBytes, createHash } from 'crypto'

export const dynamic = 'force-dynamic'

const ALLOWED_EXT = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp', '.msg', '.eml', '.txt']
const MAX_SIZE    = 20 * 1024 * 1024 // 20 MB

function parseEml(content: string): { from: string | null; subject: string | null; body: string } {
  const lines = content.split('\n')
  const headers: Record<string, string> = {}
  let inHeader = true
  const bodyLines: string[] = []

  for (const line of lines) {
    if (inHeader) {
      if (line.trim() === '') { inHeader = false; continue }
      const m = line.match(/^(From|Subject|Date|To|X-Sender):\s*(.+)$/i)
      if (m) headers[m[1].toLowerCase()] = m[2].trim()
    } else {
      bodyLines.push(line)
    }
  }

  const body = bodyLines.join('\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 4000)

  return {
    from:    headers['from'] || headers['x-sender'] || null,
    subject: headers['subject'] || null,
    body,
  }
}

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const files    = formData.getAll('files') as File[]

  if (!files.length) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

  const dir = join(process.cwd(), 'public', 'uploads', 'central')
  await mkdir(dir, { recursive: true })

  const created = []

  for (const file of files) {
    const ext = extname(file.name).toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) continue
    if (file.size > MAX_SIZE)       continue

    const buffer   = Buffer.from(await file.arrayBuffer())
    const hash     = createHash('sha256').update(buffer).digest('hex').slice(0, 16)
    const safeName = `central-${randomBytes(4).toString('hex')}-${hash}${ext}`
    const filePath = join(dir, safeName)
    await writeFile(filePath, buffer)

    // Extract text content for .eml and .txt
    let pastedContent: string | null = null
    let senderName:   string | null = null
    let senderEmail:  string | null = null
    let subject:      string | null = null

    if (ext === '.eml' || ext === '.txt') {
      try {
        const text = buffer.toString('utf-8')
        if (ext === '.eml') {
          const parsed = parseEml(text)
          pastedContent = parsed.body
          subject       = parsed.subject
          const fromMatch = parsed.from?.match(/^(.+?)\s*<(.+?)>$/)
          if (fromMatch) { senderName = fromMatch[1].trim(); senderEmail = fromMatch[2].trim() }
          else if (parsed.from?.includes('@')) senderEmail = parsed.from
          else senderName = parsed.from
        } else {
          pastedContent = text.substring(0, 4000)
        }
      } catch { /* ignore parse errors */ }
    }

    const item = await prisma.centralItem.create({
      data: {
        source:       'UPLOAD',
        title:        subject || file.name,
        subject,
        senderName,
        senderEmail,
        pastedContent,
      },
    })

    await prisma.centralAttachment.create({
      data: {
        itemId:   item.id,
        fileName: file.name,
        fileType: file.type || ext,
        fileSize: file.size,
        filePath: `/uploads/central/${safeName}`,
      },
    })

    await prisma.centralHistory.create({
      data: { itemId: item.id, action: 'RECEBIDO', detail: `Arquivo: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` },
    })

    created.push(item.id)
  }

  return NextResponse.json({ ok: true, created })
}
