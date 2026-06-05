import { useState, useEffect } from 'react'
import { Order } from '@/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Phone, MessageSquare } from 'lucide-react'
import Link from 'next/link'

interface TicketCardProps {
  order: Order
  currentShopId: string
  onAccept?: () => void
  onReject?: (reason: string) => void
  onReady?: () => void
  onDelivered?: () => void
}

export default function TicketCard({ order, currentShopId, onAccept, onReject, onReady, onDelivered }: TicketCardProps) {
  // The user wants ALL items visible on the KDS so the kitchen knows the full order context,
  // but we will highlight the external items differently.
  const displayItems = order.order_items || []

  // Dark mode optimized for Kitchen Display
  const isNew = order.status === 'pending'
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})
  const [isLate, setIsLate] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')

  const toggleItem = (idx: number) => {
    setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }))
  }

  const handleCancelSubmit = () => {
    if (!cancelReason.trim()) return
    onReject?.(cancelReason)
    setShowCancelModal(false)
    setCancelReason('')
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

  const isDineIn = order.order_type === 'dine_in'

  return (
    <div className={`rounded-xl overflow-hidden flex flex-col border-2 ${
      isNew && !isDineIn ? 'bg-[#1E293B] border-amber-500/50' : 
      isNew && isDineIn ? 'bg-[#1E293B] border-indigo-500/50' :
      isLate ? 'bg-rose-950/40 border-rose-500/80' : 'bg-[#1E293B] border-slate-700'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex justify-between items-center ${
        isNew && !isDineIn ? 'bg-amber-500 text-amber-950' : 
        isNew && isDineIn ? 'bg-indigo-500 text-white' :
        isLate ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-200'
      }`}>
        <div className="flex items-center gap-2">
          <h3 className="font-bold font-mono text-lg">{order.order_number}</h3>
          {order.order_type === 'dine_in' ? (
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-200 border border-purple-500/50 text-[10px] font-black rounded-md uppercase tracking-wide">DINE-IN</span>
              {order.hostel_name && (
                <span className="px-2 py-0.5 bg-red-600 text-white border border-red-500 shadow-[0_0_8px_rgba(220,38,38,0.5)] text-[11px] font-black rounded-md uppercase tracking-wide">
                  {order.hostel_name.replace('[Dine-In] ', '')}
                </span>
              )}
            </div>
          ) : (
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-200 border border-blue-500/50 text-[10px] font-black rounded-md uppercase tracking-wide">DELIVERY</span>
          )}
          {isLate && <span className="px-2 py-0.5 bg-white text-rose-600 text-xs font-black rounded-sm tracking-wider uppercase">10M LATE!</span>}
        </div>
        <span className="text-sm font-bold">{new Date(order.placed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</span>
      </div>

      {/* Items */}
      <div className="p-4 flex-1 space-y-3">
        {displayItems.length === 0 ? (
          <p className="text-slate-400 italic">No items found</p>
        ) : (
          displayItems.map((item, idx) => {
            const isChecked = checkedItems[idx]
            
            const isExternalItem = item.partner_shop_id 
              ? item.partner_shop_id !== currentShopId 
              : order.shop_id !== currentShopId;

            return (
              <div 
                key={idx} 
                onClick={() => toggleItem(idx)}
                className={`flex flex-col gap-1 cursor-pointer transition-all p-3 rounded-xl border ${
                  isExternalItem 
                    ? 'bg-purple-500/10 border-purple-500/30' 
                    : 'bg-slate-700/20 border-transparent hover:bg-slate-700/40'
                } ${isChecked ? 'opacity-50' : 'opacity-100'}`}
              >
                <div className={`flex justify-between items-start ${isChecked ? 'text-slate-500 line-through' : (isExternalItem ? 'text-purple-200' : 'text-slate-100')}`}>
                  <div className="flex gap-3 items-center">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${isChecked ? 'bg-emerald-500 border-emerald-500 text-emerald-950' : (isExternalItem ? 'border-purple-500/50' : 'border-slate-500')}`}>
                      {isChecked && <span className="text-xs font-bold">✓</span>}
                    </div>
                    <span className="font-bold text-lg">{item.quantity}x</span>
                    <div>
                      <p className="font-bold text-lg">{item.item_name}</p>
                    </div>
                  </div>
                </div>
                {isExternalItem && (
                  <div className="pl-8">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-md">
                      Partner Add-on: {item.partner?.name || 'External Shop'}
                    </span>
                  </div>
                )}
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
        {order.student && (
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="mb-3 text-slate-300">
              <span className="text-xs uppercase tracking-wider font-bold text-slate-500 block mb-1">Customer Details</span>
              <p className="font-bold text-sm">{order.student.full_name || 'No Name Provided'}</p>
              {order.student.phone && <p className="text-sm">{order.student.phone}</p>}
            </div>
            <div className="flex gap-2">
              {order.student.phone && (
                <a 
                  href={`tel:${order.student.phone}`} 
                  className="flex-1 bg-slate-700/50 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
                >
                  <Phone size={16} /> Call
                </a>
              )}
              <Link 
                href={`/shop/orders`} 
                className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition"
              >
                <MessageSquare size={16} /> Chat
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-800/50 mt-auto flex flex-col gap-2">
        {isNew && (
          <div className="flex gap-2 w-full">
            <button onClick={() => setShowCancelModal(true)} className="flex-1 bg-rose-500/10 text-rose-500 font-bold py-3 rounded-xl hover:bg-rose-500/20 transition text-sm">
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
            <button onClick={() => setShowCancelModal(true)} className="w-full bg-transparent border border-rose-500/30 text-rose-500 font-bold py-2 rounded-xl hover:bg-rose-500/10 transition text-sm">
              Cancel Order
            </button>
          </div>
        )}
        {order.status === 'ready' && (
          <div className="flex flex-col gap-2 w-full">
            <div className="w-full bg-slate-700/50 text-emerald-400 border border-emerald-500/30 font-bold text-lg py-4 rounded-xl text-center flex items-center justify-center gap-2">
              <span className="animate-pulse">⏳</span> {isDineIn ? 'Ready at Kitchen' : 'Waiting for Rider'}
            </div>
            {onDelivered && (
              <button onClick={onDelivered} className="w-full bg-emerald-600/20 text-emerald-500 border border-emerald-500/50 font-bold text-sm py-2 rounded-xl hover:bg-emerald-600/30 transition shadow-sm">
                {isDineIn ? 'Order Arriving to Table' : 'Mark Delivered (Manual Pickup)'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-5 border-b border-slate-700">
              <h3 className="font-bold text-slate-100 text-lg">Cancel Order #{order.order_number}</h3>
              <p className="text-slate-400 text-xs mt-1">Please provide a reason for the customer.</p>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Out of stock, closing early..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                rows={3}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl hover:bg-slate-600 transition"
                >
                  Back
                </button>
                <button 
                  onClick={handleCancelSubmit}
                  disabled={!cancelReason.trim()}
                  className="flex-1 bg-rose-600 text-white font-bold py-2.5 rounded-xl hover:bg-rose-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-600/20"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
