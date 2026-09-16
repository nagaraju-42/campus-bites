'use client'

import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { X, User, Phone, MapPin, CheckCircle, ChefHat, Bike, PhoneCall, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function FocusedOrderModal() {
  const { focusedOrderId, setFocusedOrderId, orders, updateOrderStatus } = useShopOrdersStore()
  const [isUpdating, setIsUpdating] = useState(false)

  if (!focusedOrderId) return null

  const order = orders.find(o => o.id === focusedOrderId)

  const handleUpdateStatus = async (newStatus: any) => {
    if (!order) return
    setIsUpdating(true)
    try {
      await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      updateOrderStatus(order.id, newStatus)
      toast.success(`Order marked as ${newStatus}`)
      
      if (newStatus === 'completed') {
        setFocusedOrderId(null)
      }
    } catch (err) {
      toast.error('Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  // Helper for Status Tracker
  const stages = ['pending', 'preparing', 'ready', 'completed'];
  const currentStageIndex = stages.indexOf(order?.status || 'pending');

  return (
    <div className="fixed inset-0 bg-black/60 z-[999] flex items-center justify-center p-4 md:p-6 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-gray-50 w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-5 bg-white border-b border-gray-100">
          <button 
            onClick={() => setFocusedOrderId(null)}
            className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 transition"
          >
            <X size={20} />
          </button>
          <h2 className="text-lg font-bold text-gray-900 flex-1 text-center pr-10">
            Order #{order?.order_number || '---'}
          </h2>
        </div>

        <div className="overflow-y-auto flex-1 p-5">
          {!order ? (
            <div className="text-center py-10">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-500 font-medium">Fetching details...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Horizontal Status Tracker */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex justify-between items-center relative">
                {/* Background Line */}
                <div className="absolute top-[40px] left-[15%] right-[15%] h-1 bg-gray-100 -z-0"></div>
                {/* Active Line Progress */}
                <div 
                  className="absolute top-[40px] left-[15%] h-1 bg-green-500 -z-0 transition-all duration-500"
                  style={{ width: `${Math.max(0, (currentStageIndex / (stages.length - 1)) * 70)}%` }}
                ></div>

                <div className="flex flex-col items-center z-10 gap-2 relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStageIndex >= 0 ? 'bg-green-500 text-white shadow-lg shadow-green-500/30' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                    <ReceiptText size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Received</span>
                </div>

                <div className="flex flex-col items-center z-10 gap-2 relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStageIndex >= 1 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                    <ChefHat size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Preparing</span>
                </div>

                <div className="flex flex-col items-center z-10 gap-2 relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStageIndex >= 2 ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                    <Bike size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Ready/Out</span>
                </div>

                <div className="flex flex-col items-center z-10 gap-2 relative">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentStageIndex >= 3 ? 'bg-gray-800 text-white shadow-lg shadow-gray-800/30' : 'bg-white border-2 border-gray-200 text-gray-400'}`}>
                    <CheckCircle size={20} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-600">Delivered</span>
                </div>
              </div>

              {/* Customer Info Card with Direct Call Button */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                    {(order.student?.full_name || 'U').charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{order.student?.full_name || 'Unknown Student'}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={12} /> {order.hostel_name ? `${order.hostel_name} ${order.room_number || ''}` : 'Pickup'}
                    </p>
                  </div>
                </div>

                {/* Call Button directly beside phone number layout */}
                {order.student?.phone && (
                  <div className="mt-4 flex items-center justify-between bg-green-50 p-3 rounded-2xl border border-green-100">
                    <div className="flex items-center gap-2 text-green-800">
                      <Phone size={16} />
                      <span className="font-bold tracking-wide">{order.student.phone}</span>
                    </div>
                    <a 
                      href={`tel:${order.student.phone}`}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
                    >
                      <PhoneCall size={16} /> Call Student
                    </a>
                  </div>
                )}
              </div>

              {/* Items list */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-400 uppercase text-xs tracking-wider mb-4 border-b border-gray-50 pb-2">Order Items</h3>
                <div className="space-y-4">
                  {(order.order_items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start">
                      <div className="flex items-start gap-3">
                        <span className="text-gray-900 font-black text-sm mt-0.5">
                          {item.quantity}x
                        </span>
                        <div>
                          <p className="font-bold text-gray-900 text-sm leading-tight">{item.item_name}</p>
                        </div>
                      </div>
                      <span className="font-bold text-gray-700 text-sm">
                        {formatCurrency(item.price_at_time * item.quantity)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-4 border-t border-dashed border-gray-200 mt-4">
                    <span className="font-bold text-gray-500">Grand Total</span>
                    <span className="text-2xl font-black text-gray-900">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Action Buttons */}
        {order && (
          <div className="p-5 bg-white border-t border-gray-100">
            {order.status === 'pending' && (
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('preparing')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-500/20 text-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                <ChefHat size={20} /> Accept & Start Preparing
              </button>
            )}
            {order.status === 'preparing' && (
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('ready')}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-600/20 text-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                <Bike size={20} /> Mark as Ready / Out
              </button>
            )}
            {order.status === 'ready' && (
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('completed')}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl shadow-lg shadow-gray-900/20 text-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                <CheckCircle size={24} /> Mark Completed
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
