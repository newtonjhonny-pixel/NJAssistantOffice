import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomBytes } from "crypto"

export const dynamic = "force-dynamic"

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE     = 5 * 1024 * 1024 // 5 MB
const MAX_PER_TASK = 5

// Verificação de magic bytes (cabeçalho binário do arquivo)
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === "image/png") {
    return buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47
  }
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff
  }
  if (mimeType === "image/webp") {
    return buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  }
  return false
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const attachments = await prisma.taskAttachment.findMany({
    where: { taskId: params.id },
    orderBy: { createdAt: "asc" },
  })
  return NextResponse.json(attachments)
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  // Verificar se tarefa existe
  const task = await prisma.task.findUnique({ where: { id: params.id } })
  if (!task) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 })

  // Verificar limite
  const count = await prisma.taskAttachment.count({ where: { taskId: params.id } })
  if (count >= MAX_PER_TASK) {
    return NextResponse.json({ error: `Limite de ${MAX_PER_TASK} imagens por tarefa atingido.` }, { status: 400 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Erro ao processar o arquivo enviado." }, { status: 400 })
  }

  const file = formData.get("file") as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Nenhum arquivo enviado." }, { status: 400 })
  }

  // Validar MIME type declarado
  if (!ALLOWED_MIME.includes(file.type)) {
    return NextResponse.json({ error: "Formato não permitido. Use PNG, JPG ou WEBP." }, { status: 400 })
  }

  // Validar tamanho
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "A imagem excede o tamanho máximo permitido de 5 MB." }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  // Validar magic bytes para segurança
  if (!validateMagicBytes(buffer, file.type)) {
    return NextResponse.json({ error: "O arquivo não é uma imagem válida." }, { status: 400 })
  }

  // Gerar nome único
  const extMap: Record<string, string> = {
    "image/png":  "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  }
  const ext       = extMap[file.type] ?? "jpg"
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, "").substring(0, 14)
  const rand      = randomBytes(4).toString("hex")
  const safeName  = `task-${params.id.substring(0, 8)}-${timestamp}-${rand}.${ext}`

  // Salvar arquivo
  const uploadDir = join(process.cwd(), "public", "uploads", "tasks")
  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, safeName), buffer)

  // Salvar no banco
  const attachment = await prisma.taskAttachment.create({
    data: {
      taskId:   params.id,
      fileName: file.name || safeName,
      fileType: file.type,
      fileSize: file.size,
      filePath: `/uploads/tasks/${safeName}`,
    },
  })

  return NextResponse.json(attachment, { status: 201 })
}
