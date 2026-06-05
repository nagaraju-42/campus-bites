'use client'

import { useState, useRef } from 'react'
import { UploadCloud, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Image from 'next/image'

interface Props {
  bucket: string
  folderPath: string
  onUploadSuccess: (url: string) => void
  currentImage?: string | null
  maxSizeMB?: number
  maxWidth?: number
}

export default function ImageUploadWebP({ bucket, folderPath, onUploadSuccess, currentImage, maxSizeMB = 5, maxWidth = 800 }: Props) {
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(currentImage || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Max size is ${maxSizeMB}MB`)
      return
    }

    try {
      setIsUploading(true)
      
      // 1. Convert to WebP using Canvas
      const webpBlob = await compressToWebP(file, maxWidth)
      const optimizedFile = new File([webpBlob], `${Date.now()}.webp`, { type: 'image/webp' })
      
      // Local preview
      const previewUrl = URL.createObjectURL(optimizedFile)
      setPreview(previewUrl)

      // 2. Upload to Supabase Storage
      const supabase = createClient()
      const fileName = `${folderPath}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`
      
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, optimizedFile, {
          cacheControl: '31536000',
          upsert: false
        })

      if (error) throw error

      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(fileName)
      
      onUploadSuccess(publicUrl)
      toast.success('Image optimized and uploaded!')
    } catch (err) {
      console.error(err)
      toast.error('Failed to upload image')
      setPreview(currentImage || null) // Revert preview
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const compressToWebP = (file: File, maxWidth: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img')
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        let width = img.width
        let height = img.height
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }
        
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas ctx null'))
        
        ctx.drawImage(img, 0, 0, width, height)
        
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Canvas toBlob failed'))
          },
          'image/webp',
          0.8 // 80% quality
        )
      }
      img.onerror = reject
      img.src = url
    })
  }

  return (
    <div className="w-full">
      <input
        type="file"
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileSelect}
      />
      
      {preview ? (
        <div className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 group">
          <Image src={preview} alt="Upload preview" fill className="object-cover" unoptimized={preview.startsWith('blob:')} />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-4 py-2 bg-white text-gray-900 font-bold rounded-lg text-sm"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => {
                setPreview(null)
                onUploadSuccess('') // Clear it
              }}
              className="p-2 bg-red-500 text-white rounded-lg"
            >
              <X size={20} />
            </button>
          </div>
          {isUploading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center flex-col gap-2">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <span className="text-xs font-bold text-gray-700">Optimizing...</span>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition"
        >
          {isUploading ? (
            <>
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <span className="text-sm font-bold text-gray-700">Optimizing...</span>
            </>
          ) : (
            <>
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <UploadCloud size={20} />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-700">Click to upload image</p>
                <p className="text-xs font-medium text-gray-400">Auto-converts to tiny WebP format</p>
              </div>
            </>
          )}
        </button>
      )}
    </div>
  )
}
