import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readdirSync, statSync, copyFileSync, mkdirSync, existsSync } from 'fs'
import { join, basename, extname } from 'path'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

const ALLOWED_EXT = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp', '.msg', '.eml', '.txt']

export async function POST() {
  const cfg = await prisma.centralConfig.findFirst()
  if (!cfg?.folderPath || !cfg.folderEnabled) {
    return NextResponse.json({ error: 'Pasta monitorada não configurada ou desativada.' }, { status: 400 })
  }

  const folderPath = cfg.folderPath.trim()
  if (!existsSync(folderPath)) {
    return NextResponse.json({ error: `Pasta não encontrada: ${folderPath}` }, { status: 400 })
  }

  const destDir = join(process.cwd(), 'public', 'uploads', 'central')
  mkdirSync(destDir, { recursive: true })

  const processedDir = cfg.folderMoveProcessed && cfg.folderProcessedPath
    ? cfg.folderProcessedPath
    : join(folderPath, 'Processados')

  let files: string[]
  try {
    files = readdirSync(folderPath)
  } catch (e) {
    return NextResponse.json({ error: `Erro ao ler pasta: ${e}` }, { status: 500 })
  }

  const importedNames: string[] = []
  const errors: string[] = []

  for (const fname of files) {
    const ext = extname(fname).toLowerCase()
    if (!ALLOWED_EXT.includes(ext)) continue

    const srcPath = join(folderPath, fname)
    try {
      const stat = statSync(srcPath)
      if (!stat.isFile()) continue

      const safeName = `central-scan-${randomBytes(4).toString('hex')}${ext}`
      const destPath = join(destDir, safeName)
      copyFileSync(srcPath, destPath)

      const item = await prisma.centralItem.create({
        data: {
          source: 'FOLDER',
          title:  fname,
          subject: fname,
        },
      })
      await prisma.centralAttachment.create({
        data: {
          itemId:   item.id,
          fileName: fname,
          fileType: ext,
          fileSize: stat.size,
          filePath: `/uploads/central/${safeName}`,
        },
      })
      await prisma.centralHistory.create({
        data: { itemId: item.id, action: 'IMPORTADO DA PASTA', detail: folderPath },
      })

      // Optionally move to processed folder
      if (cfg.folderMoveProcessed) {
        mkdirSync(processedDir, { recursive: true })
        try { copyFileSync(srcPath, join(processedDir, fname)) } catch { /* ignore */ }
      }

      importedNames.push(fname)
    } catch (err) {
      errors.push(`${fname}: ${err}`)
    }
  }

  return NextResponse.json({ imported: importedNames.length, files: importedNames, errors })
}
