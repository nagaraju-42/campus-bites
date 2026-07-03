'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Clock, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Rider2HistoryPage() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchHistory() {
      if (!user) return
      
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('orders')
          .select(`
            *,
            shops(name),
            student:profiles!orders_student_id_fkey(full_name)
          `)
          .eq('rider_id', user.id)
          .in('status', ['delivered', 'cancelled'])
          .order('placed_at', { ascending: false })

        if (error) throw error
        setOrders(data || [])
      } catch (err) {
        console.error("Failed to fetch history:", err)
        toast.error("Failed to load history")
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0FDF4] pb-20">
        <div className="w-12 h-12 border-4 border-[#16A34A] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#16A34A] font-bold text-sm">Loading History...</p>
      </div>
    )
  }

  // Group orders by date
  const groupedOrders: Record<string, any[]> = {}
  orders.forEach(order => {
    const dateStr = new Date(order.placed_at).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    if (!groupedOrders[dateStr]) groupedOrders[dateStr] = []
    groupedOrders[dateStr].push(order)
  })

  return (
    <div className="px-5 pt-8 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <Clock size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Order History</h1>
          <p className="text-gray-500 font-medium text-sm">Past deliveries & cancellations</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 mt-6 shadow-sm">
          <p className="text-5xl mb-4">📜</p>
          <h3 className="font-bold text-gray-900 text-lg mb-2">No History Yet</h3>
          <p className="text-gray-500 text-sm">Your completed and cancelled deliveries will appear here.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedOrders).map(([dateLabel, dateOrders]) => (
            <div key={dateLabel}>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">{dateLabel}</h2>
              <div className="space-y-3">
                {dateOrders.map(order => {
                  const isDelivered = order.status === 'delivered'
                  const isCash = order.payment_method === 'cash_on_delivery'
                  
                  return (
                    <div 
                      key={order.id} 
                      className={`bg-white rounded-2xl p-4 border shadow-sm relative overflow-hidden ${
                        !isDelivered ? 'border-red-100' : isCash ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
                      }`}
                    >
                      {/* Status indicator side-bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${isDelivered ? 'bg-green-500' : 'bg-red-500'}`} />
                      
                      <div className="flex justify-between items-start pl-2 mb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-lg">#{order.order_number}</h3>
                            {isDelivered ? (
                              <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <CheckCircle2 size={10} /> Delivered
                              </span>
                            ) : (
                              <span className="bg-red-100 text-red-700 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                <XCircle size={10} /> Cancelled
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(order.placed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            {' '}• {order.shops?.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold block ${!isDelivered ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                      </div>

                      <div className="pl-2 pt-2 border-t border-gray-100 flex justify-between items-center mt-2">
                        <div className="text-xs font-medium text-gray-600 truncate max-w-[60%]">
                          👤 {order.student?.full_name || 'Student'}
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md ${
                          isCash 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                        }`}>
                          {isCash ? '💵 CASH TO COLLECT' : '💳 PREPAID / UPI'}
                        </div>
                      </div>
                      
                      {!isDelivered && order.special_note && (
                        <div className="mt-2 pl-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-100">
                          <strong>Note:</strong> {order.special_note}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
