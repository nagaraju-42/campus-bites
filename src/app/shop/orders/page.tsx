'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { useAuthStore } from '@/store/authStore'
import { updateOrderStatusDB, cancelOrderAsShop, getShopOrderHistory } from '@/lib/supabase/queries/shop-dashboard'
import { formatCurrency } from '@/lib/utils'
import { Order } from '@/types'
import { MessageSquare, X, Phone, AlertCircle } from 'lucide-react'
import OrderChat from '@/components/shared/OrderChat'
import toast from 'react-hot-toast'

const TABS = ['New', 'Preparing', 'Ready', 'History']

export default function ShopOrdersPage() {
  const { user } = useAuthStore()
  // Select orders directly so component re-renders on change
  const { orders } = useShopOrdersStore()
  const [activeTab, setActiveTab] = useState('New')
  const [chatOrderId, setChatOrderId] = useState<string | null>(null)
  const [cancelModalOrder, setCancelModalOrder] = useState<{ id: string, number: string } | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [historyOrders, setHistoryOrders] = useState<Order[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const { shopId } = useShopOrdersStore()

  const newOrders = orders.filter(o => o.status === 'pending')
  const prepOrders = orders.filter(o => o.status === 'preparing')
  const readyOrders = orders.filter(o => o.status === 'ready')

  const currentOrders = 
    activeTab === 'New' ? newOrders :
    activeTab === 'Preparing' ? prepOrders : 
    activeTab === 'Ready' ? readyOrders : historyOrders

  useEffect(() => {
    if (activeTab === 'History' && shopId) {
      setIsLoadingHistory(true)
      getShopOrderHistory(shopId).then(data => {
        setHistoryOrders(data)
        setIsLoadingHistory(false)
      }).catch(err => {
        toast.error('Failed to load history')
        setIsLoadingHistory(false)
      })
    }
  }, [activeTab, shopId])

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await updateOrderStatusDB(orderId, status, user?.id)
      toast.success(`Order moved to ${status}`)
    } catch (err) {
      toast.error('Failed to update status')
    }
  }

  const handleCancelOrder = (orderId: string, orderNumber: string) => {
    setCancelModalOrder({ id: orderId, number: orderNumber })
    setCancelReason('')
  }

  const submitCancelOrder = async () => {
    if (!cancelModalOrder || !cancelReason.trim()) return
    
    try {
      await cancelOrderAsShop(cancelModalOrder.id, user?.id || '', cancelReason.trim())
      toast.success('Order cancelled and student notified.')
      setCancelModalOrder(null)
    } catch (err) {
      toast.error('Failed to cancel order')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-500 font-medium text-sm">Manage incoming and active orders</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-100">
        {TABS.map(tab => {
          const count = tab === 'New' ? newOrders.length : tab === 'Preparing' ? prepOrders.length : readyOrders.length
          const isActive = activeTab === tab
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg font-bold text-sm transition-all ${
                isActive ? 'bg-[#2563EB] text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab}
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {currentOrders.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="bg-white p-12 rounded-2xl text-center border border-dashed border-gray-200"
            >
              <p className="text-4xl mb-3">🍽️</p>
              <p className="text-gray-500 font-medium">No {activeTab.toLowerCase()} orders at the moment.</p>
            </motion.div>
          ) : (
            currentOrders.map(order => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                key={order.id}
                className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-5 items-start sm:items-center"
              >
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg text-gray-900 leading-none">{order.order_number}</h3>
                        {order.order_type === 'dine_in' ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-md uppercase tracking-wide">DINE-IN</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md uppercase tracking-wide">DELIVERY</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-500 mt-1">
                        {new Date(order.placed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        {order.student?.phone && (
                          <span className="ml-2 inline-flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                            <span className="font-bold text-gray-700">{order.student.full_name}:</span> {order.student.phone}
                            <a href={`tel:${order.student.phone}`} className="ml-1 text-[#2563EB] hover:bg-blue-100 p-1 rounded-full transition" title="Call Student">
                              <Phone size={12} />
                            </a>
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-bold text-lg text-[#2563EB]">{formatCurrency(order.total_amount)}</span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {order.order_items?.map((item, idx) => (
                      <p key={idx} className="text-sm text-gray-700 font-medium">
                        <span className="font-bold">{item.quantity}x</span> {item.item_name}
                      </p>
                    ))}
                  </div>

                  {order.status === 'cancelled' && order.special_note ? (
                    <div className="bg-red-50 p-3 rounded-xl border border-red-100 mb-3">
                      <p className="text-xs font-bold text-red-800 uppercase flex items-center gap-1 mb-1"><AlertCircle size={14}/> Cancellation Reason</p>
                      <p className="text-sm font-medium text-red-900">{order.special_note}</p>
                    </div>
                  ) : order.special_note ? (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100 mb-3">
                      <p className="text-xs font-bold text-amber-800 uppercase mb-1">Note from customer</p>
                      <p className="text-sm font-medium text-amber-900">{order.special_note}</p>
                    </div>
                  ) : null}

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setChatOrderId(order.id)}
                      className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-[#2563EB] hover:text-blue-700 transition px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg"
                    >
                      <MessageSquare size={16} /> Contact
                    </button>
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-gray-700 hover:text-gray-900 transition px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      View Details
                    </button>
                  </div>
                </div>

                <div className="w-full sm:w-48 flex flex-col gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-5">
                  {activeTab === 'New' && (
                    <>
                      <button onClick={() => handleStatusChange(order.id, 'preparing')} className="w-full bg-[#2563EB] text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-sm">
                        Accept Order
                      </button>
                      <button onClick={() => handleCancelOrder(order.id, order.order_number)} className="w-full bg-white border-2 border-red-100 text-red-600 font-bold py-2.5 rounded-xl hover:bg-red-50 transition">
                        Cancel Order
                      </button>
                    </>
                  )}
                  {activeTab === 'Preparing' && (
                    <>
                      <button onClick={() => handleStatusChange(order.id, 'ready')} className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition shadow-sm">
                        Mark as Ready
                      </button>
                      <button onClick={() => handleCancelOrder(order.id, order.order_number)} className="w-full bg-white border-2 border-red-100 text-red-600 font-bold py-2.5 rounded-xl hover:bg-red-50 transition text-sm">
                        Cancel Order
                      </button>
                    </>
                  )}
                  {activeTab === 'Ready' && (
                    <div className="text-center p-4 bg-gray-50 rounded-xl">
                      <p className="text-sm font-bold text-gray-600">Waiting for Rider</p>
                      <p className="text-xs text-gray-400 mt-1">Order will move to completed once delivered.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Chat Modal */}
      <AnimatePresence>
        {chatOrderId && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="flex justify-between items-center p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={18} className="text-[#2563EB]"/> Customer Chat
                </h3>
                <button onClick={() => setChatOrderId(null)} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-200 rounded-full">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 bg-gray-100 h-[60vh] md:h-[500px]">
                <OrderChat orderId={chatOrderId} />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancellation Modal */}
      {cancelModalOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-gray-100">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Cancel Order #{cancelModalOrder.number}</h3>
                <p className="text-gray-500 text-xs mt-1">Provide a reason for the customer.</p>
              </div>
              <button onClick={() => setCancelModalOrder(null)} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-200 rounded-full">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <textarea
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Out of stock, shop closed..."
                className="w-full bg-white border border-gray-300 rounded-xl p-3 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={3}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setCancelModalOrder(null)}
                  className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-xl hover:bg-gray-200 transition"
                >
                  Back
                </button>
                <button 
                  onClick={submitCancelOrder}
                  disabled={!cancelReason.trim()}
                  className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition disabled:opacity-50 shadow-lg shadow-red-600/20"
                >
                  Confirm Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                  Order #{selectedOrder.order_number}
                  {selectedOrder.order_type === 'dine_in' ? (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] font-black rounded-md uppercase tracking-wide">DINE-IN</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-md uppercase tracking-wide">DELIVERY</span>
                  )}
                </h3>
                <p className="text-gray-500 text-sm mt-1">Status: <span className="font-bold text-gray-800 uppercase">{selectedOrder.status}</span></p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-200 rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto space-y-6">
              {/* Customer Info */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Customer Information</h4>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                  <p className="text-sm"><span className="text-gray-500">Name:</span> <span className="font-bold text-gray-900">{(selectedOrder as any).student?.full_name || 'N/A'}</span></p>
                  <p className="text-sm flex items-center justify-between">
                    <span><span className="text-gray-500">Phone:</span> <span className="font-bold text-gray-900">{(selectedOrder as any).student?.phone || 'N/A'}</span></span>
                    {(selectedOrder as any).student?.phone && (
                      <a href={`tel:${(selectedOrder as any).student.phone}`} className="text-blue-600 font-bold text-xs bg-blue-50 px-2 py-1 rounded">Call</a>
                    )}
                  </p>
                  <p className="text-sm"><span className="text-gray-500">Destination:</span> <span className="font-bold text-gray-900">{selectedOrder.hostel_name}</span></p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Order Items</h4>
                <div className="space-y-3">
                  {selectedOrder.order_items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <p className="text-sm text-gray-800"><span className="font-bold">{item.quantity}x</span> {item.item_name}</p>
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(item.unit_price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financials */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Delivery Fee</span>
                  <span className="font-medium">{formatCurrency(selectedOrder.delivery_fee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Platform Fee</span>
                  <span className="font-medium">{formatCurrency(selectedOrder.platform_fee)}</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200 mt-2">
                  <span className="text-gray-900">Total Amount</span>
                  <span className="text-[#2563EB]">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Special Note */}
              {selectedOrder.special_note && (
                <div>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Notes / Audit</h4>
                  <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                    <p className="text-sm font-medium text-amber-900 whitespace-pre-wrap">{selectedOrder.special_note}</p>
                  </div>
                </div>
              )}
              
            </div>
            <div className="p-4 border-t border-gray-100 bg-white shrink-0">
              <button 
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-gray-100 text-gray-800 font-bold py-3 rounded-xl hover:bg-gray-200 transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
