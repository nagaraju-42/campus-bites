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
            <div className="flex flex-col items-center justify-center h-40 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              Order not found
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Top Card: Status Tracker */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 relative pt-10 pb-8">
                {/* Horizontal Status Tracker */}
                <div className="relative">
                  {/* Background Line */}
                  <div className="absolute top-[18px] left-[10%] right-[10%] h-1.5 bg-gray-100 -z-0 rounded-full"></div>
                  {/* Active Line Progress */}
                  <div 
                    className="absolute top-[18px] left-[10%] h-1.5 bg-orange-500 -z-0 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(0, (currentStageIndex / 3) * 80)}%` }}
                  ></div>

                  <div className="flex justify-between items-center z-10 relative px-2">
                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] bg-white ${currentStageIndex >= 0 ? 'border-green-500 text-green-500' : 'border-gray-200 text-gray-300'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                      </div>
                      <span className={`text-[11px] font-bold ${currentStageIndex >= 0 ? 'text-gray-800' : 'text-gray-400'}`}>Received</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] ${currentStageIndex >= 1 ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
                      </div>
                      <span className={`text-[11px] font-bold ${currentStageIndex >= 1 ? 'text-gray-800' : 'text-gray-400'}`}>Preparing</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] bg-white ${currentStageIndex >= 2 ? 'border-blue-500 text-blue-500' : 'border-gray-200 text-gray-300'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="17" r="3"></circle><circle cx="17" cy="17" r="3"></circle><path d="M14 17h-4"></path><path d="M3 17h1"></path><path d="M20 17h1"></path><path d="M14 14H3V7c0-1.1.9-2 2-2h6l3 4z"></path><path d="M14 14h5l1-3h-6"></path></svg>
                      </div>
                      <span className={`text-[11px] font-bold text-center leading-tight ${currentStageIndex >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>Out for<br/>Delivery</span>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] bg-white ${currentStageIndex >= 3 ? 'border-gray-400 text-gray-500' : 'border-gray-200 text-gray-300'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className={`text-[11px] font-bold ${currentStageIndex >= 3 ? 'text-gray-800' : 'text-gray-400'}`}>Delivered</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Info Card with Direct Call Button */}
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 mb-4">
                  <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                    {(order.student?.full_name || 'U').charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight mb-0.5">{order.student?.full_name || 'Unknown Student'}</h3>
                    <p className="text-xs text-gray-500 leading-tight">
                      {order.hostel_name ? `${order.hostel_name} ${order.room_number || ''}` : 'Pickup'}
                    </p>
                  </div>
                </div>

                {/* Call Button directly beside phone number layout */}
                {order.student?.phone && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-700">
                      <Phone size={16} className="text-green-600" />
                      <span className="font-semibold text-sm tracking-wide">{order.student.phone}</span>
                    </div>
                    <a 
                      href={`tel:${order.student.phone}`}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95"
                    >
                      <PhoneCall size={16} /> Call Student
                    </a>
                  </div>
                )}
              </div>

              {/* Receipt / Items list */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <div className="space-y-3">
                  {(order.order_items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start text-sm">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600">{item.quantity}x</span>
                        <span className="font-medium text-gray-800">{item.item_name}</span>
                      </div>
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(item.price_at_time * item.quantity)}
                      </span>
                    </div>
                  ))}
                  
                  <div className="pt-4 mt-2 border-t border-gray-100 space-y-2 text-sm">
                    <div className="flex justify-between items-center text-gray-600 font-medium">
                      <span>Subtotal</span>
                      <span>{formatCurrency(order.total_amount - (order.delivery_fee || 0))}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 font-medium">
                      <span>Delivery Fee</span>
                      <span>{formatCurrency(order.delivery_fee || 0)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                    <span className="font-bold text-gray-900 text-base">Grand Total</span>
                    <span className="text-lg font-black text-gray-900">{formatCurrency(order.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Delivery Address Box */}
              <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 text-sm mb-1">Delivery Address</h4>
                  <p className="text-xs font-medium text-gray-500">
                    {order.hostel_name ? `${order.hostel_name}, Room ${order.room_number || ''}` : 'Pickup'}
                  </p>
                </div>
                <div className="w-16 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
                  <MapPin size={20} className="text-red-500" />
                </div>
              </div>

              {/* Order Notes (If Any) */}
              {order.special_note && (
                <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-900 text-sm mb-1">Order Notes</h4>
                  <p className="text-sm font-medium text-gray-600 bg-gray-50 p-3 rounded-xl border border-gray-100">
                    {order.special_note}
                  </p>
                </div>
              )}

            </div>
          )}
        </div>

        {/* Action Buttons */}
        {order && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
            {order.status === 'pending' && (
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('preparing')}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 text-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                Accept Order
              </button>
            )}
            {order.status === 'preparing' && (
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('ready')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/20 text-lg transition active:scale-95 flex items-center justify-center gap-2"
              >
                Mark as Ready / Out
              </button>
            )}
            {(order.status === 'ready' || order.status === 'assigned' || order.status === 'out_for_delivery') && (
              <button
                disabled={isUpdating}
                onClick={() => handleUpdateStatus('delivered')}
                className="w-full bg-gray-900 hover:bg-black text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-gray-900/20 text-lg transition flex items-center justify-center gap-2 active:scale-95"
              >
                Mark Delivered
              </button>
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}
