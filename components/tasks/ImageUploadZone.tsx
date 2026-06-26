"use client"

import { useEffect, useRef, useCallback } from "react"
import { ImageIcon, Upload, X, ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE      = 5 * 1024 * 1024
const MAX_FILES     = 5

export interface PendingImage {
  id: string
  file: File
  preview: string
  error?: string
}

interface ImageUploadZoneProps {
  images: PendingImage[]
  onChange: (images: PendingImage[]) => void
  /** Quantidade de imagens já salvas na tarefa (para respeitar limite) */
  existingCount?: number
  /** Chamado ao clicar para ampliar preview */
  onPreview?: (src: string, name: string) => void
}

function uid() {
  return Math.random().toString(36).slice(2)
}

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return `"${file.name}" não é permitido. Use PNG, JPG ou WEBP.`
  }
  if (file.size > MAX_SIZE) {
    return `"${file.name}" excede o tamanho máximo de 5 MB.`
  }
  return null
}

export function ImageUploadZone({
  images,
  onChange,
  existingCount = 0,
  onPreview,
}: ImageUploadZoneProps) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const zoneRef   = useRef<HTMLDivElement>(null)

  const remaining = MAX_FILES - existingCount - images.length

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files)
      const toAdd: PendingImage[] = []

      for (const file of arr) {
        if (existingCount + images.length + toAdd.length >= MAX_FILES) break
        const error = validateFile(file)
        const preview = error ? "" : URL.createObjectURL(file)
        toAdd.push({ id: uid(), file, preview, error: error ?? undefined })
      }

      onChange([...images, ...toAdd])
    },
    [images, onChange, existingCount]
  )

  // Captura CTRL+V em qualquer lugar da página enquanto o form está montado
  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items
      if (!items) return
      const imageItems = Array.from(items).filter(
        (item) => item.kind === "file" && item.type.startsWith("image/")
      )
      if (imageItems.length === 0) return
      const files = imageItems.map((i) => i.getAsFile()).filter(Boolean) as File[]
      if (files.length > 0) {
        e.preventDefault()
        addFiles(files)
      }
    }
    document.addEventListener("paste", handlePaste)
    return () => document.removeEventListener("paste", handlePaste)
  }, [addFiles])

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.length) {
      addFiles(e.target.files)
      e.target.value = ""
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
  }

  function remove(id: string) {
    const img = images.find((i) => i.id === id)
    if (img?.preview) URL.revokeObjectURL(img.preview)
    onChange(images.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-3">
      {/* Zona de drop / paste */}
      <div
        ref={zoneRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={cn(
          "border-2 border-dashed rounded-lg px-4 py-5 text-center transition-colors",
          remaining > 0
            ? "border-slate-200 hover:border-blue-300 bg-slate-50 hover:bg-blue-50/30 cursor-pointer"
            : "border-slate-100 bg-slate-50 opacity-60 cursor-not-allowed"
        )}
        onClick={() => remaining > 0 && inputRef.current?.click()}
      >
        <ImageIcon className="w-8 h-8 mx-auto text-slate-300 mb-2" />
        <p className="text-sm text-slate-500">
          Cole aqui prints, imagens ou evidências da tarefa.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-500 text-xs font-mono">Ctrl+V</kbd>
          {" "}para colar · arraste · ou{" "}
          <span className="text-blue-500 underline">selecione um arquivo</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          PNG, JPG, WEBP · máx. 5 MB por imagem · {remaining} de {MAX_FILES} vagas restantes
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleFileInput}
          disabled={remaining <= 0}
        />
      </div>

      {/* Grid de previews */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {images.map((img) => (
            <div key={img.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100">
              {img.error ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                  <X className="w-5 h-5 text-red-400 mb-1" />
                  <p className="text-xs text-red-500 text-center leading-tight">{img.error}</p>
                </div>
              ) : (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.preview}
                    alt={img.file.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay com ações */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                    {onPreview && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onPreview(img.preview, img.file.name) }}
                        className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-slate-700 hover:bg-white"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); remove(img.id) }}
                      className="w-7 h-7 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Erros de validação */}
      {images.some((i) => i.error) && (
        <div className="space-y-1">
          {images.filter((i) => i.error).map((i) => (
            <p key={i.id} className="text-xs text-red-600 flex items-center gap-1">
              <X className="w-3 h-3" /> {i.error}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}
