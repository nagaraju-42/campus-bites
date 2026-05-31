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
  
  return (
    <div className={`rounded-xl overflow-hidden flex flex-col border-2 ${
      isNew ? 'bg-[#1E293B] border-amber-500/50' : 'bg-[#1E293B] border-slate-700'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex justify-between items-center ${
        isNew ? 'bg-amber-500 text-amber-950' : 'bg-slate-800 text-slate-200'
      }`}>
        <h3 className="font-bold font-mono text-lg">{order.order_number}</h3>
        <span className="text-sm font-bold">{new Date(order.placed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>

      {/* Items */}
      <div className="p-4 flex-1 space-y-3">
        {order.order_items?.map((item, idx) => (
          <div key={idx} className="flex justify-between items-start text-slate-100">
            <div className="flex gap-3">
              <span className="font-bold text-lg">{item.quantity}x</span>
              <div>
                <p className="font-bold text-lg">{item.item_name}</p>
              </div>
            </div>
          </div>
        ))}
        {order.special_note && (
          <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-amber-400 text-sm font-bold uppercase tracking-wider">Note:</p>
            <p className="text-amber-200 font-medium">{order.special_note}</p>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-slate-800/50 mt-auto flex gap-3">
        {isNew && (
          <>
            <button onClick={onReject} className="flex-1 bg-rose-500/10 text-rose-500 font-bold py-4 rounded-xl hover:bg-rose-500/20 transition">
              Reject
            </button>
            <button onClick={onAccept} className="flex-[2] bg-amber-500 text-amber-950 font-bold text-lg py-4 rounded-xl hover:bg-amber-400 transition shadow-lg shadow-amber-500/20">
              Start Preparing
            </button>
          </>
        )}
        {order.status === 'preparing' && (
          <button onClick={onReady} className="w-full bg-emerald-500 text-emerald-950 font-bold text-lg py-4 rounded-xl hover:bg-emerald-400 transition shadow-lg shadow-emerald-500/20">
            Mark Ready
          </button>
        )}
      </div>
    </div>
  )
}
