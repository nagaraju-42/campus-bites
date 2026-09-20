'use client'

import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Clock, User } from 'lucide-react'

import { useEffect, useState } from 'react'
import { Order } from '@/types'
import { updateShopStatusDB } from '@/lib/supabase/queries/shop-dashboard'
import toast from 'react-hot-toast'

export default function SimpleKDS() {
  const { orders, setFocusedOrderId, shopId, isLive, setLiveStatus } = useShopOrdersStore()
  const [history, setHistory] = useState<Order[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [isToggling, setIsToggling] = useState(false)

  useEffect(() => {
    if (shopId) {
      import('@/app/actions/orders').then(m => {
        m.getShopOrderHistoryAdmin(shopId, 20).then(data => {
          setHistory(data)
          setLoadingHistory(false)
        })
      })
    }
  }, [shopId, orders]) // Refetch history when orders array changes (e.g., an order is completed)

  const toggleStatus = async () => {
    if (!shopId || isToggling) return
    setIsToggling(true)
    const newStatus = !isLive
    try {
      await updateShopStatusDB(shopId, newStatus)
      setLiveStatus(newStatus)
      toast.success(`Shop is now ${newStatus ? 'OPEN' : 'CLOSED'}`)
    } catch (err) {
      toast.error('Failed to update shop status')
    } finally {
      setIsToggling(false)
    }
  }

  // Filter out completed/cancelled orders for the simple KDS
  const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready', 'out_for_delivery'].includes(o.status))

  const getStageIndex = (status: string) => {
    switch(status) {
      case 'pending': return 0;
      case 'preparing': return 1;
      case 'ready': 
      case 'assigned':
      case 'out_for_delivery': return 2;
      case 'delivered': return 3;
      default: return 0;
    }
  }

  const getStatusText = (status: string) => {
    switch(status) {
      case 'pending': return 'Order received, waiting for acceptance';
      case 'preparing': return 'Preparing the order';
      case 'ready': return 'Ready for pickup/delivery';
      case 'assigned':
      case 'out_for_delivery': return 'Out for delivery';
      case 'delivered': return 'Delivered';
      default: return 'Processing';
    }
  }

  return (
    <div className="space-y-10 pb-20 max-w-4xl mx-auto w-full px-2 md:px-0">
      
      {/* Active Orders Section */}
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="text-orange-500" />
            Live Active Orders
            <span className="bg-orange-100 text-orange-600 text-sm py-1 px-3 rounded-full ml-2">
              {activeOrders.length}
            </span>
          </h2>

          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-gray-200 shadow-sm">
            <span className={`font-bold text-sm ${isLive ? 'text-green-600' : 'text-red-500'}`}>
              {isToggling ? '...' : isLive ? 'OPEN' : 'CLOSED'}
            </span>
            <button 
              onClick={toggleStatus}
              disabled={isToggling}
              className={`w-14 h-7 rounded-full p-1 transition-colors duration-300 relative focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 ${
                isToggling ? 'bg-gray-300 cursor-not-allowed' :
                isLive ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              <div 
                className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ease-in-out absolute top-1 ${
                  isLive ? 'translate-x-7' : 'translate-x-0'
                }`} 
              />
            </button>
          </div>
        </div>
        
        {activeOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl shadow-sm border border-gray-100 min-h-[300px]">
            <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Clock size={40} className="text-gray-300" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Active Orders</h2>
            <p className="text-gray-500 font-medium text-center">New orders will appear here automatically.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeOrders.map(order => {
              const stageIndex = getStageIndex(order.status)
              const isFocused = useShopOrdersStore.getState().focusedOrderId === order.id
              
              return (
                <div key={order.id} className="w-full">
                  <button
                    onClick={() => setFocusedOrderId(order.id)}
                    className={`p-5 rounded-3xl shadow-sm border flex flex-col gap-4 text-left w-full transition-all duration-200 active:scale-95 active:bg-orange-100 active:shadow-inner
                      ${isFocused ? 'bg-blue-50 border-blue-300 shadow-md ring-2 ring-blue-500/20' : 'bg-white border-gray-200 hover:bg-orange-50/50 hover:border-orange-300 hover:shadow-md'}`}
                  >
                    <div className="flex items-center justify-between w-full border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                          {(order.student?.full_name || 'U').charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-900 text-lg leading-tight">
                            {order.student?.full_name || 'Unknown'} <span className="text-gray-400 text-sm ml-1">#{order.order_number}</span>
                          </h3>
                          <p className="text-sm font-medium text-gray-500">
                            {formatDate(order.placed_at)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Direct Call Button on Dashboard */}
                      {order.student?.phone && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            window.location.href = `tel:${order.student!.phone}`;
                          }}
                          className="bg-green-100 hover:bg-green-200 text-green-700 p-3 rounded-full transition active:scale-95 shrink-0"
                          title="Call Student"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
                        </button>
                      )}
                    </div>

                    {/* Horizontal Status Tracker - 3 Stages */}
                    <div className="relative py-4 w-full">
                      {/* Background Line */}
                      <div className="absolute top-[32px] left-[15%] right-[15%] h-1.5 bg-gray-100 -z-0 rounded-full"></div>
                      {/* Active Line Progress */}
                      <div 
                        className="absolute top-[32px] left-[15%] h-1.5 bg-orange-500 -z-0 transition-all duration-500 rounded-full"
                        style={{ width: `${Math.max(0, (Math.min(stageIndex, 2) / 2) * 70)}%` }}
                      ></div>

                      <div className="flex justify-between items-center z-10 relative px-4">
                        <div className="flex flex-col items-center gap-1.5 bg-transparent">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border-[3px] \${stageIndex >= 0 ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                          </div>
                          <span className={`text-[10px] font-bold \${stageIndex >= 0 ? 'text-gray-800' : 'text-gray-400'}`}>Received</span>
                        </div>

                        <div className="flex flex-col items-center gap-1.5 bg-transparent">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border-[3px] \${stageIndex >= 1 ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
                          </div>
                          <span className={`text-[10px] font-bold \${stageIndex >= 1 ? 'text-gray-800' : 'text-gray-400'}`}>Preparing</span>
                        </div>

                        <div className="flex flex-col items-center gap-1.5 bg-transparent">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border-[3px] \${stageIndex >= 2 ? 'bg-blue-500 border-blue-500 text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </div>
                          <span className={`text-[10px] font-bold \${stageIndex >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>Delivered</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center text-sm font-medium text-gray-500 mt-[-8px]">
                      {getStatusText(order.status)}
                    </div>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="pt-8 border-t border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>
          Today's History
        </h2>
        
        {loadingHistory ? (
          <div className="text-center py-10 text-gray-500">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 text-gray-500">No completed orders yet today.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-75 hover:opacity-100 transition-opacity">
            {history.map(order => (
              <button
                key={order.id}
                onClick={() => setFocusedOrderId(order.id)}
                className={`p-5 rounded-3xl shadow-sm border flex flex-col gap-3 text-left w-full transition-all duration-200 active:scale-95 active:bg-orange-100 active:shadow-inner ${order.status === 'cancelled' ? 'border-red-100 hover:border-red-300' : 'border-gray-200 hover:border-orange-300 hover:shadow-md hover:bg-orange-50/50'} bg-white`}
              >
                <div className="flex items-center justify-between w-full pb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${order.status === 'cancelled' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-600'} rounded-full flex items-center justify-center font-bold text-lg shrink-0`}>
                      {(order.student?.full_name || 'U').charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 leading-tight">
                        {order.student?.full_name || 'Unknown'} <span className="text-gray-400 text-xs ml-1">#{order.order_number}</span>
                      </h3>
                      <p className="text-xs font-medium text-gray-500">
                        {formatDate(order.placed_at)}
                      </p>
                    </div>
                  </div>
                  
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${order.status === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                    {order.status === 'cancelled' ? 'Cancelled' : 'Delivered'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
