/**
 * lib/imports/parsers/pdfParser.ts
 *
 * Único ponto do sistema que chama pdf-parse.
 * Só pode ser importado em server components / API routes.
 */
import 'server-only'

export interface PdfParseResult {
  fullText: string
  pageCount: number
  /** Texto de cada página individualmente (index 0 = página 1) */
  pages: string[]
}

/**
 * Extrai texto de um Buffer PDF, página a página.
 * Usa pdf-parse@1.1.1 com opção pagerender personalizada para capturar cada página.
 */
export async function parsePdfBuffer(buffer: Buffer): Promise<PdfParseResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
    buffer: Buffer,
    options?: Record<string, unknown>
  ) => Promise<{ text: string; numpages: number }>

  const pageTexts: string[] = []

  // pagerender é chamado para cada página — acumulamos o texto individualmente
  const options = {
    pagerender: async (pageData: any) => {
      const tc = await pageData.getTextContent({ normalizeWhitespace: false })
      let lastY: number | null = null
      const lines: string[] = []
      for (const item of tc.items as any[]) {
        const str: string = item.str ?? ''
        const y: number = item.transform?.[5] ?? 0
        if (lastY !== null && Math.abs(y - lastY) > 2) {
          lines.push('\n')
        }
        lines.push(str)
        lastY = y
      }
      const pageText = lines.join(' ').replace(/ +\n/g, '\n').replace(/\n +/g, '\n')
      pageTexts.push(pageText)
      return pageText
    },
  }

  const result = await pdfParse(buffer, options)

  // Se pagerender não foi chamado (pdf-parse versão sem suporte), cai no fullText
  const pages = pageTexts.length > 0 ? pageTexts : [result.text]

  return {
    fullText: result.text,
    pageCount: result.numpages,
    pages,
  }
}
