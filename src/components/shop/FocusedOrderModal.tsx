'use client'

import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { X, User, Phone, MapPin, CheckCircle, ChefHat, Bike, PhoneCall, ReceiptText } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { updateOrderStatusDB } from '@/lib/supabase/queries/shop-dashboard'
import { useAuthStore } from '@/store/authStore'
import { useEffect } from 'react'

export default function FocusedOrderModal() {
  const { user } = useAuthStore()
  const { focusedOrderId, setFocusedOrderId, orders, updateOrderStatus } = useShopOrdersStore()
  const [isUpdating, setIsUpdating] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [fetchedOrder, setFetchedOrder] = useState<any>(null)

  useEffect(() => {
    if (focusedOrderId && !orders.find(o => o.id === focusedOrderId)) {
      import('@/app/actions/orders').then(m => {
        m.getOrderByIdAdmin(focusedOrderId).then(data => setFetchedOrder(data))
      })
    }
  }, [focusedOrderId, orders])

  if (!focusedOrderId) return null

  const order = orders.find(o => o.id === focusedOrderId) || fetchedOrder
  const closeModal = () => {
    setFocusedOrderId(null)
    setIsRejecting(false)
    setRejectReason('')
  }

  const handleUpdateStatus = async (newStatus: any) => {
    if (!order) return
    setIsUpdating(true)
    try {
      await updateOrderStatusDB(order.id, newStatus, user?.id)
      
      updateOrderStatus(order.id, newStatus)
      toast.success(`Order marked as ${newStatus}`)
      
      if (newStatus === 'delivered' || newStatus === 'completed') {
        closeModal()
      }
    } catch (err) {
      toast.error('Failed to update status')
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleRejectOrder = async () => {
    if (!order || !user || !rejectReason.trim()) return
    setIsUpdating(true)
    try {
      const { cancelOrderAsShop } = await import('@/lib/supabase/queries/shop-dashboard')
      await cancelOrderAsShop(order.id, user.id, rejectReason)

      updateOrderStatus(order.id, 'cancelled')
      toast.success('Order cancelled successfully')
      closeModal()
    } catch (err) {
      toast.error('Failed to cancel order')
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }

  // Helper for Status Tracker
  const stages = ['pending', 'preparing', 'ready', 'delivered'];
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
                  <div className="absolute top-[18px] left-[15%] right-[15%] h-1.5 bg-gray-100 -z-0 rounded-full"></div>
                  {/* Active Line Progress */}
                  <div 
                    className="absolute top-[18px] left-[15%] h-1.5 bg-orange-500 -z-0 transition-all duration-500 rounded-full"
                    style={{ width: `${Math.max(0, (Math.min(currentStageIndex, 2) / 2) * 70)}%` }}
                  ></div>

                  <div className="flex justify-between items-center z-10 relative px-4">
                    <button 
                      disabled={isUpdating}
                      className="flex flex-col items-center gap-2 transition active:scale-95"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] bg-white ${currentStageIndex >= 0 ? 'border-green-500 text-green-500 shadow-sm' : 'border-gray-200 text-gray-300'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                      </div>
                      <span className={`text-[11px] font-bold ${currentStageIndex >= 0 ? 'text-gray-800' : 'text-gray-400'}`}>Received</span>
                    </button>

                    <button 
                      onClick={() => handleUpdateStatus('preparing')}
                      disabled={isUpdating || currentStageIndex >= 1}
                      className="flex flex-col items-center gap-2 transition active:scale-95"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] ${currentStageIndex >= 1 ? 'bg-orange-500 border-orange-500 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-300 hover:border-orange-300'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/><line x1="6" y1="17" x2="18" y2="17"/></svg>
                      </div>
                      <span className={`text-[11px] font-bold ${currentStageIndex >= 1 ? 'text-gray-800' : 'text-gray-400'}`}>Preparing</span>
                    </button>

                    <button 
                      onClick={() => handleUpdateStatus('delivered')}
                      disabled={isUpdating || currentStageIndex >= 2}
                      className="flex flex-col items-center gap-2 transition active:scale-95"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center border-[3px] bg-white ${currentStageIndex >= 2 ? 'border-gray-400 text-gray-500 shadow-sm' : 'border-gray-200 text-gray-300 hover:border-gray-400'}`}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      </div>
                      <span className={`text-[11px] font-bold ${currentStageIndex >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>Delivered</span>
                    </button>
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
            {order.status === 'pending' && !isRejecting && (
              <div className="flex gap-3">
                <button
                  disabled={isUpdating}
                  onClick={() => setIsRejecting(true)}
                  className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 font-bold py-3.5 rounded-2xl transition active:scale-95 text-center"
                >
                  Reject
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleUpdateStatus('preparing')}
                  className="flex-[2] bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-orange-500/20 text-lg transition active:scale-95 text-center"
                >
                  Accept Order
                </button>
              </div>
            )}
            
            {order.status === 'pending' && isRejecting && (
              <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2">
                <input 
                  type="text" 
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Reason for cancellation..." 
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    disabled={isUpdating}
                    onClick={() => setIsRejecting(false)}
                    className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 rounded-xl transition active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    disabled={isUpdating || !rejectReason.trim()}
                    onClick={handleRejectOrder}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition active:scale-95 disabled:opacity-50"
                  >
                    Confirm Reject
                  </button>
                </div>
              </div>
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
