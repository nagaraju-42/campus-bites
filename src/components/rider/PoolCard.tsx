import { MapPin, Navigation } from 'lucide-react'
import { Order } from '@/types'
import { formatCurrency } from '@/lib/utils'
import OrderTimeCard from '@/components/shared/OrderTimeCard'

interface PoolCardProps {
  order: Order
  onClaim: (orderId: string) => void
  isClaiming?: boolean
}

export default function PoolCard({ order, onClaim, isClaiming }: PoolCardProps) {
  // Approximate delivery fee (or use actual if set)
  const fee = order.delivery_fee || 15

  return (
    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-green-100 text-[#16A34A] text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider">
              Ready for Pickup
            </span>
            <OrderTimeCard placedAt={order.placed_at} status={order.status} />
          </div>
          <p className="font-bold text-gray-900 mt-1">Order {order.order_number}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400 font-medium">Est. Earning</p>
          <p className="font-bold text-lg text-[#16A34A]">{formatCurrency(fee)}</p>
        </div>
      </div>

      <div className="relative pl-6 space-y-4 mb-5">
        {/* Timeline Line */}
        <div className="absolute top-2 left-[9px] bottom-2 w-0.5 bg-gray-100"></div>

        {/* Pickup */}
        <div className="relative">
          <div className="absolute -left-6 top-0.5 w-5 h-5 bg-white border-4 border-gray-300 rounded-full z-10"></div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pickup</p>
          <p className="text-sm font-bold text-gray-900 mt-0.5">{order.shops?.name}</p>
          {order.order_items?.some((i: any) => i.partner_shop_id) && (
            <p className="text-xs text-[#F97316] font-bold mt-0.5">
              + {order.order_items.find((i: any) => i.partner_shop_id)?.partner?.name}
            </p>
          )}
          {order.shops?.description && !order.order_items?.some((i: any) => i.partner_shop_id) && (
            <p className="text-xs text-gray-400 truncate">{order.shops.description}</p>
          )}
        </div>

        {/* Dropoff */}
        <div className="relative">
          <div className="absolute -left-[23px] top-1 w-4 h-4 bg-white border-4 border-[#16A34A] rounded-full z-10"></div>
          <p className="text-xs font-bold text-[#16A34A] uppercase tracking-wider mb-1">Drop-off / Address</p>
          <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2">
            📍 {order.hostel_name}
          </p>
        </div>
      </div>

      <button
        onClick={() => onClaim(order.id)}
        disabled={isClaiming}
        className="w-full bg-[#16A34A] text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-green-700 transition active:scale-95 disabled:opacity-70 shadow-md shadow-green-100"
      >
        <Navigation size={18} />
        {isClaiming ? 'Claiming...' : 'Accept Delivery'}
      </button>
    </div>
  )
}
