'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

interface SwipeButtonProps {
  onConfirm: () => void
  text: string
  successText?: string
}

export default function SwipeButton({ onConfirm, text, successText = 'Success!' }: SwipeButtonProps) {
  const [isSuccess, setIsSuccess] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const x = useMotionValue(0)
  const controls = useAnimation()
  
  // Calculate dynamic threshold based on container width
  const threshold = containerWidth > 0 ? containerWidth - 70 : 200 // 70 is approx thumb width + padding

  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth)
    }
  }, [])

  const handleDragEnd = () => {
    if (x.get() > threshold * 0.8) {
      // Swiped far enough
      setIsSuccess(true)
      controls.start({ x: threshold })
      setTimeout(() => {
        onConfirm()
      }, 300)
    } else {
      // Snap back
      controls.start({ x: 0 })
    }
  }

  // Visual effects based on drag position
  const opacity = useTransform(x, [0, threshold * 0.5], [1, 0])
  const bg = useTransform(
    x, 
    [0, threshold], 
    ['rgb(22 163 74)', 'rgb(16 185 129)'] // Green 600 -> Emerald 500
  )

  if (isSuccess) {
    return (
      <div className="w-full h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-lg shadow-inner">
        ✓ {successText}
      </div>
    )
  }

  return (
    <motion.div 
      ref={containerRef}
      className="relative w-full h-16 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden flex items-center"
      style={{ backgroundColor: bg as any }}
    >
      <motion.p 
        style={{ opacity }}
        className="absolute w-full text-center font-bold text-white z-0 pointer-events-none drop-shadow-md"
      >
        {text}
      </motion.p>
      
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: threshold }}
        dragElastic={0.1}
        onDragEnd={handleDragEnd}
        animate={controls}
        style={{ x }}
        className="w-14 h-14 bg-white rounded-full shadow-lg flex items-center justify-center z-10 ml-1 cursor-grab active:cursor-grabbing border-2 border-green-500 text-green-600"
      >
        <ChevronRight size={24} strokeWidth={3} />
      </motion.div>
    </motion.div>
  )
}
