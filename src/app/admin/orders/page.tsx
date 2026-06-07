'use client'

import { useEffect, useState } from 'react'
import { Search, MapPin, Phone, Mail, Clock, AlertCircle, CheckCircle2, History, X, ShieldAlert, MessageSquare, ShoppingBag } from 'lucide-react'
import { getAllPlatformOrders, forceCancelOrder, getOrderAuditLogs, adminDeleteOrderItem } from '@/lib/supabase/queries/admin'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import OrderChat from '@/components/shared/OrderChat'
import toast from 'react-hot-toast'

export default function AdminOrdersGodMode() {
  const { user } = useAuthStore()
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  // Modal State
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null)
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [isLogsLoading, setIsLogsLoading] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [rightTab, setRightTab] = useState<'audit' | 'chat' | 'items'>('items')

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    try {
      const data = await getAllPlatformOrders()
      setOrders(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load platform orders')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenOrder = async (order: any) => {
    setSelectedOrder(order)
    setRightTab('items')
    setIsLogsLoading(true)
    try {
      const logs = await getOrderAuditLogs(order.id)
      setAuditLogs(logs)
    } catch (err) {
      toast.error('Failed to load audit logs')
    } finally {
      setIsLogsLoading(false)
    }
  }

  const handleForceCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Please provide a reason for cancellation')
      return
    }
    if (!window.confirm("Are you sure you want to FORCE CANCEL this order? This cannot be undone.")) return
    
    try {
      await forceCancelOrder(selectedOrder.id, user!.id, cancelReason)
      toast.success('Order Force Cancelled')
      setCancelReason('')
      setSelectedOrder({ ...selectedOrder, status: 'cancelled' })
      loadOrders() // Refresh list
    } catch (err) {
      toast.error('Failed to cancel order')
    }
  }

  const handleDeleteItem = async (item: any) => {
    if (!window.confirm(`Are you sure you want to completely remove ${item.quantity}x ${item.item_name} from this order? The total amount will be recalculated.`)) return
    
    try {
      const itemTotalCost = item.unit_price * item.quantity
      await adminDeleteOrderItem(selectedOrder.id, item.id, itemTotalCost, user!.id, item.item_name)
      toast.success('Item deleted and order recalculated')
      
      // Optimistically update UI
      const newItems = selectedOrder.order_items.filter((i: any) => i.id !== item.id)
      const newTotal = Math.max(0, selectedOrder.total_amount - itemTotalCost)
      setSelectedOrder({ ...selectedOrder, order_items: newItems, total_amount: newTotal })
      
      // Refresh logs
      const logs = await getOrderAuditLogs(selectedOrder.id)
      setAuditLogs(logs)
      loadOrders() // Refresh background list
    } catch (err) {
      toast.error('Failed to delete item')
    }
  }

  const filteredOrders = orders.filter(o => 
    o.order_number.toLowerCase().includes(search.toLowerCase()) ||
    (o.shops?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (o.student?.full_name || '').toLowerCase().includes(search.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'delivered': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20'
      default: return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">Platform Orders (God Mode)</h1>
          <p className="text-slate-400 mt-1">Monitor, audit, and force-resolve any order on the platform.</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-[#1E293B] p-4 rounded-2xl border border-slate-700/50 flex items-center gap-3">
        <Search className="text-slate-400" size={20} />
        <input 
          type="text" 
          placeholder="Search by Order #, Shop, or Customer Name..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-transparent border-none text-white outline-none w-full"
        />
      </div>

      {/* Orders List */}
      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 shadow-lg overflow-x-auto">
        {isLoading ? (
          <div className="p-10 text-center text-slate-500">Loading platform orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-10 text-center text-slate-500">No orders found.</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F172A]/50 border-b border-slate-700/50 text-slate-400 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">Order Details</th>
                <th className="px-6 py-4">Shop</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {filteredOrders.map(order => (
                <tr 
                  key={order.id} 
                  onClick={() => handleOpenOrder(order)}
                  className="hover:bg-slate-800/50 transition cursor-pointer group"
                >
                  <td className="px-6 py-4">
                    <p className="font-bold text-white group-hover:text-[#2563EB] transition">{order.order_number}</p>
                    <p className="text-xs text-slate-400 mt-1">{new Date(order.placed_at).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-300">{order.shops?.name || 'Unknown Shop'}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-300">{order.student?.full_name || 'Unknown'}</p>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold text-white">
                    {formatCurrency(order.total_amount)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(order.status)}`}>
                      {order.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* God Mode Detailed Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-700/50 shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-slate-700/50 flex justify-between items-center bg-[#0F172A]">
              <div>
                <h2 className="text-2xl font-display font-bold text-white flex items-center gap-3">
                  {selectedOrder.order_number}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getStatusColor(selectedOrder.status)}`}>
                    {selectedOrder.status.replace('_', ' ')}
                  </span>
                </h2>
                <p className="text-sm text-slate-400 mt-1">Placed at {new Date(selectedOrder.placed_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Details */}
              <div className="space-y-6">
                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><MapPin size={16}/> Delivery Location</h3>
                  <p className="text-white font-bold">{selectedOrder.hostel_name}</p>
                  <p className="text-slate-300 text-sm mt-1">{selectedOrder.block ? `Block ${selectedOrder.block}, ` : ''}Room {selectedOrder.room_number}</p>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2"><Phone size={16}/> Customer Contact</h3>
                  {selectedOrder.student ? (
                    <div className="space-y-3">
                      <p className="text-white font-bold">{selectedOrder.student.full_name}</p>
                      <p className="text-slate-300 text-sm flex items-center gap-2"><Phone size={14} className="text-slate-500"/> {selectedOrder.student.phone || 'No phone provided'}</p>
                      <p className="text-slate-300 text-sm flex items-center gap-2"><Mail size={14} className="text-slate-500"/> {selectedOrder.student.email}</p>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-sm">Customer details unavailable.</p>
                  )}
                </div>

                {selectedOrder.special_note && (
                  <div className="bg-amber-500/10 rounded-xl p-5 border border-amber-500/20">
                    <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider mb-2 flex items-center gap-2"><AlertCircle size={14}/> Notes / Issues</h3>
                    <p className="text-amber-200/80 text-sm leading-relaxed">{selectedOrder.special_note}</p>
                  </div>
                )}
              </div>

              {/* Right Column: Audit Logs & Actions */}
              <div className="space-y-6 flex flex-col h-full">
                
                <div className="bg-[#0F172A]/50 rounded-xl border border-slate-700/50 flex flex-col flex-1 overflow-hidden">
                  <div className="flex border-b border-slate-700/50">
                    <button 
                      onClick={() => setRightTab('items')}
                      className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition ${rightTab === 'items' ? 'bg-[#1E293B] text-slate-200' : 'text-slate-500 hover:bg-[#1E293B]/50'}`}
                    >
                      <ShoppingBag size={14} /> Items
                    </button>
                    <button 
                      onClick={() => setRightTab('audit')}
                      className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition ${rightTab === 'audit' ? 'bg-[#1E293B] text-slate-200' : 'text-slate-500 hover:bg-[#1E293B]/50'}`}
                    >
                      <History size={14} /> Audit
                    </button>
                    <button 
                      onClick={() => setRightTab('chat')}
                      className={`flex-1 py-3 text-sm font-bold uppercase tracking-wider flex justify-center items-center gap-2 transition ${rightTab === 'chat' ? 'bg-[#1E293B] text-slate-200' : 'text-slate-500 hover:bg-[#1E293B]/50'}`}
                    >
                      <MessageSquare size={14} /> Chat
                    </button>
                  </div>
                  
                  <div className="flex-1 p-5 overflow-y-auto">
                    {rightTab === 'items' ? (
                      <div>
                        {selectedOrder.order_items && selectedOrder.order_items.length > 0 ? (
                          <div className="space-y-3">
                            {selectedOrder.order_items.map((item: any) => (
                              <div key={item.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded-xl border border-slate-700/50 shadow-md">
                                <div className="flex items-center gap-3">
                                  <span className="bg-blue-500/20 text-blue-400 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border border-blue-500/30">{item.quantity}x</span>
                                  <div>
                                    <p className="text-base font-bold text-slate-200">{item.item_name}</p>
                                    <p className="text-xs font-mono text-slate-400 mt-0.5">{formatCurrency(item.unit_price * item.quantity)} total</p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => handleDeleteItem(item)}
                                  className="text-red-400 hover:text-white p-2.5 bg-red-500/10 hover:bg-red-500 rounded-lg transition border border-red-500/20 shadow-sm"
                                  title="Delete Item"
                                >
                                  <X size={18} />
                                </button>
                              </div>
                            ))}
                            <div className="mt-4 p-4 bg-[#1E293B] rounded-xl border border-slate-700 flex justify-between items-center">
                              <span className="text-slate-400 font-bold uppercase text-xs tracking-wider">Current Order Total:</span>
                              <span className="text-xl font-bold font-mono text-emerald-400">{formatCurrency(selectedOrder.total_amount)}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-10">
                            <ShoppingBag size={40} className="text-slate-700 mx-auto mb-3" />
                            <p className="text-slate-400 font-bold">No items found for this order.</p>
                            <p className="text-slate-500 text-xs mt-1">(It might be an old test order or cached data)</p>
                          </div>
                        )}
                      </div>
                    ) : rightTab === 'audit' ? (
                      isLogsLoading ? (
                        <p className="text-slate-500 text-sm text-center py-4">Loading logs...</p>
                      ) : auditLogs.length === 0 ? (
                        <p className="text-slate-500 text-sm text-center py-4">No status changes tracked yet.</p>
                      ) : (
                        <div className="space-y-4">
                          {auditLogs.map((log, idx) => (
                            <div key={log.id} className="relative pl-6 pb-4">
                              {idx !== auditLogs.length - 1 && <div className="absolute left-[7px] top-4 bottom-0 w-px bg-slate-700"></div>}
                              <div className="absolute left-0 top-1 w-[15px] h-[15px] rounded-full bg-slate-800 border-2 border-slate-600"></div>
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="text-sm font-bold text-white capitalize">{log.status_from} ➔ {log.status_to}</p>
                                  <p className="text-xs text-slate-400 mt-1">by <span className="text-blue-400 font-bold">{log.changed_by?.full_name || 'System'}</span> ({log.changed_by?.role || 'auto'})</p>
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">{new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    ) : (
                      <div className="h-[400px]">
                        <OrderChat orderId={selectedOrder.id} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Danger Zone */}
                {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                  <div className="bg-red-500/5 rounded-xl p-5 border border-red-500/20">
                    <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-4 flex items-center gap-2"><ShieldAlert size={14}/> Admin Dispute Resolution</h3>
                    <input 
                      type="text" 
                      placeholder="Reason for forced cancellation / refund..."
                      value={cancelReason}
                      onChange={e => setCancelReason(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-white mb-3"
                    />
                    <button 
                      onClick={handleForceCancel}
                      className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg text-sm transition shadow-lg shadow-red-600/20"
                    >
                      Force Cancel & Refund Order
                    </button>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
