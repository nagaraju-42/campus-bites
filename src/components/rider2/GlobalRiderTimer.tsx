'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useRiderStore } from '@/store/riderStore'
import { Clock } from 'lucide-react'

export default function GlobalRiderTimer() {
  const pathname = usePathname()
  const { activeDeliveries } = useRiderStore()
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // Only show on screens other than the main dashboard
  const shouldShow = activeDeliveries.some(o => o.status === 'out_for_delivery') && !pathname.includes('/rider2/dashboard')

  useEffect(() => {
    if (activeDeliveries.length > 0) {
      const batchId = activeDeliveries.map(o => o.id).sort().join('-')
      let claimTime = localStorage.getItem(`batch_${batchId}`)
      if (!claimTime) {
        claimTime = new Date().getTime().toString()
        localStorage.setItem(`batch_${batchId}`, claimTime)
      }
      
      const updateElapsed = () => {
        const now = new Date().getTime()
        const elapsed = Math.floor((now - parseInt(claimTime!)) / 1000)
        setElapsedSeconds(elapsed)
      }
      
      updateElapsed()
      const timer = setInterval(updateElapsed, 1000)
      return () => clearInterval(timer)
    } else {
      setElapsedSeconds(0)
    }
  }, [activeDeliveries.length])

  if (!shouldShow) return null

  const isCollectionPhase = elapsedSeconds < 300
  
  let displayTimeLeft = 0
  if (isCollectionPhase) {
    displayTimeLeft = Math.max(300 - elapsedSeconds, 0)
  } else {
    displayTimeLeft = Math.max(1500 - elapsedSeconds, 0) // 25 mins total
  }

  const mins = Math.floor(displayTimeLeft / 60)
  const secs = (displayTimeLeft % 60).toString().padStart(2, '0')

  return (
    <div className="sticky top-0 z-50 flex justify-start pt-4 px-4 pb-2 pointer-events-none bg-gray-50">
      <div className={`pointer-events-auto px-3 py-1.5 rounded-full shadow-lg border backdrop-blur-md flex items-center gap-2 ${
        displayTimeLeft < 60 
          ? 'bg-red-500/90 text-white border-red-400' 
          : isCollectionPhase 
            ? 'bg-blue-500/90 text-white border-blue-400' 
            : 'bg-orange-500/90 text-white border-orange-400'
      }`}>
        <Clock size={14} className={displayTimeLeft < 60 ? 'animate-pulse' : ''} />
        <span className="text-sm font-mono font-bold tracking-widest">{mins}:{secs}</span>
      </div>
    </div>
  )
}
