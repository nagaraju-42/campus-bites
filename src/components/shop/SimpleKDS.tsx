'use client'

import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Clock, User } from 'lucide-react'

export default function SimpleKDS() {
  const { orders, setFocusedOrderId } = useShopOrdersStore()

  // Filter out completed/cancelled orders for the simple KDS
  const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status))

  if (activeOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[400px]">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Clock size={40} className="text-gray-300" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Orders</h2>
        <p className="text-gray-500 font-medium text-center">New orders will appear here automatically.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {activeOrders.map(order => (
        <button
          key={order.id} 
          onClick={() => setFocusedOrderId(order.id)}
          className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md hover:border-blue-200 transition text-left active:scale-[0.98] w-full"
        >
          <div className="flex items-center gap-4">
            {/* Blinking Status Indicator */}
            <div className="flex-shrink-0 relative flex h-4 w-4">
              {order.status === 'pending' && (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </>
              )}
              {order.status === 'preparing' && (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-orange-500"></span>
                </>
              )}
              {order.status === 'ready' && (
                <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
              )}
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900 text-lg">#{order.order_number}</span>
                <span className="text-sm font-medium text-gray-500 flex items-center gap-1">
                  <User size={14} /> {order.student?.full_name || 'Unknown'}
                </span>
              </div>
              <p className="text-sm font-medium text-gray-600 truncate max-w-[200px] sm:max-w-[400px]">
                {(order.order_items || []).map((i: any) => `${i.quantity}x ${i.item_name}`).join(', ')}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            <span className="font-black text-gray-900">{formatCurrency(order.total_amount)}</span>
            <span className="text-xs font-bold text-gray-400">{formatDate(order.placed_at)}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
