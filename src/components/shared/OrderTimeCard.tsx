import { useEffect, useState } from 'react'

export default function OrderTimeCard({ placedAt, status }: { placedAt: string, status?: string }) {
  const [elapsedMs, setElapsedMs] = useState<number>(0)

  useEffect(() => {
    const placedTime = new Date(placedAt).getTime()
    
    setElapsedMs(Math.max(0, Date.now() - placedTime))

    const interval = setInterval(() => {
      setElapsedMs(Math.max(0, Date.now() - placedTime))
    }, 10000)
    
    return () => clearInterval(interval)
  }, [placedAt])

  if (status === 'delivered' || status === 'cancelled') {
    return null
  }

  const elapsedMins = Math.floor(elapsedMs / 60000)

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
