import { useState, useEffect } from 'react'
import { Order } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'

interface TicketCardProps {
  order: Order
  onAccept?: () => void
  onReject?: () => void
  onReady?: () => void
}

export default function TicketCard({ order, onAccept, onReject, onReady }: TicketCardProps) {
  // Dark mode optimized for Kitchen Display
  const isNew = order.status === 'pending'
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})
  const [isLate, setIsLate] = useState(false)

  const toggleItem = (idx: number) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  // Check if order has been preparing for > 10 mins
  useEffect(() => {
    if (order.status !== 'preparing') {
      setIsLate(false)
      return
    }
    const checkLate = () => {
      const prepTime = Date.now() - new Date(order.placed_at).getTime()
      setIsLate(prepTime > 10 * 60 * 1000)
    }
    checkLate()
    const interval = setInterval(checkLate, 30000)
    return () => clearInterval(interval)
  }, [order.status, order.placed_at])

  return (
    <div className={`rounded-xl overflow-hidden flex flex-col border-2 ${
      isNew ? 'bg-[#1E293B] border-amber-500/50' : 
      isLate ? 'bg-rose-950/40 border-rose-500/80' : 'bg-[#1E293B] border-slate-700'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex justify-between items-center ${
        isNew ? 'bg-amber-500 text-amber-950' : 
        isLate ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold font-mono text-lg">{order.order_number}</h3>
          {isLate && <span className="px-2 py-0.5 bg-white text-rose-600 text-xs font-black rounded-sm tracking-wider uppercase">10M LATE!</span>}
        </div>
        <span className="text-sm font-bold">{new Date(order.placed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>

      {/* Items */}
      <div className="p-4 flex-1 space-y-3">
        {order.order_items?.length === 0 ? (
          <p className="text-slate-400 italic">No items found</p>
        ) : (
          order.order_items?.map((item, idx) => {
            const isChecked = checkedItems[idx]
            return (
              <div 
                key={idx} 
                onClick={() => toggleItem(idx)}
                className={`flex justify-between items-start cursor-pointer transition-all ${isChecked ? 'text-slate-500 line-through opacity-70' : 'text-slate-100 hover:text-white'}`}
              >
                <div className="flex gap-3 items-center">
                  <div className={`w-5 h-5 rounded border flex items-center justify-center ${isChecked ? 'bg-emerald-500 border-emerald-500 text-emerald-950' : 'border-slate-500'}`}>
                    {isChecked && <span className="text-xs font-bold">✓</span>}
                  </div>
                  <span className="font-bold text-lg">{item.quantity}x</span>
                  <div>
                    <p className="font-bold text-lg">{item.item_name}</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
        {order.special_note && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Note:</p>
            <p className="text-amber-200 font-medium">{order.special_note}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-800/50 mt-auto flex flex-col gap-2">
        {isNew && (
          <div className="flex gap-2 w-full">
            <button onClick={onReject} className="flex-1 bg-rose-500/10 text-rose-500 font-bold py-3 rounded-xl hover:bg-rose-500/20 transition text-sm">
              Cancel Order
            </button>
            <button onClick={onAccept} className="flex-[2] bg-amber-500 text-amber-950 font-bold text-lg py-3 rounded-xl hover:bg-amber-400 transition shadow-lg shadow-amber-500/20">
              Start Preparing
            </button>
          </div>
        )}
        {order.status === 'preparing' && (
          <div className="flex flex-col gap-2 w-full">
            <button onClick={onReady} className="w-full bg-emerald-500 text-emerald-950 font-bold text-lg py-3 rounded-xl hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20">
              Mark Ready
            </button>
            <button onClick={onReject} className="w-full bg-transparent border border-rose-500/30 text-rose-500 font-bold py-2 rounded-xl hover:bg-rose-500/10 transition text-sm">
              Cancel Order
            </button>
          </div>
        )}
        {order.status === 'ready' && (
          <div className="w-full bg-slate-700/50 text-emerald-400 border border-emerald-500/30 font-bold text-lg py-4 rounded-xl text-center flex items-center justify-center gap-2">
            <span className="animate-pulse">⏳</span> Waiting for Rider
          </div>
        )}
      </div>
    </div>
  )
}
