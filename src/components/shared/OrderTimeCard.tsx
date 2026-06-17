import { useEffect, useState } from 'react'

export default function OrderTimeCard({ placedAt, status, endTime }: { placedAt: string, status?: string, endTime?: string | null }) {
  const [elapsedMs, setElapsedMs] = useState<number>(0)

  useEffect(() => {
    const placedTime = new Date(placedAt).getTime()
    
    // If it's finished, calculate static time and stop
    if ((status === 'delivered' || status === 'cancelled') && endTime) {
      setElapsedMs(Math.max(0, new Date(endTime).getTime() - placedTime))
      return
    }

    if (status === 'delivered' || status === 'cancelled') {
      // Fallback if no endTime provided but status is terminal
      return
    }

    setElapsedMs(Math.max(0, Date.now() - placedTime))

    const interval = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - placedTime))
    }, 10000)
    
    return () => clearInterval(interval)
  }, [placedAt, status, endTime])

  // Only calculate minutes if it's running or if it's finished but we want to show it.
  const elapsedMins = Math.floor(elapsedMs / 60000)

  if (status === 'delivered') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold bg-gray-100 text-gray-600 border-gray-200">
        <span>Took {elapsedMins} min{elapsedMins !== 1 ? 's' : ''}</span>
      </div>
    )
  }

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold bg-red-50 text-red-600 border-red-100">
        <span>Cancelled after {elapsedMins} min{elapsedMins !== 1 ? 's' : ''}</span>
      </div>
    )
  }

  let colorClass = "bg-green-100 text-green-700 border-green-200"
  let dotClass = "bg-green-500"
  let label = "Normal"

  if (elapsedMins >= 20) {
    colorClass = "bg-red-100 text-red-700 border-red-200 animate-pulse shadow-sm"
    dotClass = "bg-red-500 animate-ping"
    label = "LATE!"
  } else if (elapsedMins >= 10) {
    colorClass = "bg-orange-100 text-orange-700 border-orange-200"
    dotClass = "bg-orange-500"
    label = "Urgent"
  }

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] font-bold ${colorClass}`}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span>{elapsedMins} min{elapsedMins !== 1 ? 's' : ''} ago - {label}</span>
    </div>
  )
}
