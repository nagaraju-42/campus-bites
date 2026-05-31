'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useShopOrdersStore } from '@/store/shopOrdersStore'
import { updateOrderStatusDB } from '@/lib/supabase/queries/shop-dashboard'
import { formatCurrency } from '@/lib/utils'
import { Order } from '@/types'
import toast from 'react-hot-toast'

const TABS = ['New', 'Preparing', 'Ready']

export default function ShopOrdersPage() {
  const { getNewOrders, getPreparingOrders, getReadyOrders } = useShopOrdersStore()
  const [activeTab, setActiveTab] = useState('New')

  const newOrders = getNewOrders()
  const prepOrders = getPreparingOrders()
  const readyOrders = getReadyOrders()

  const currentOrders = 
    activeTab === 'New' ? newOrders :
    activeTab === 'Preparing' ? prepOrders : readyOrders

  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      await updateOrderStatusDB(orderId, status)
      // Note: We don't manually update local state here because 
      // the Supabase Realtime listener in layout.tsx will catch the update and do it!
      toast.success(`Order moved to ${status}`)
    } catch (err) {
      toast.error('Failed to update status')
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
                      <h3 className="font-bold text-lg text-gray-900">{order.order_number}</h3>
                      <p className="text-sm font-medium text-gray-500">
                        {new Date(order.placed_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </p>
                    </div>
                    <span className="font-bold text-lg text-[#2563EB]">{formatCurrency(order.total_amount)}</span>
                  </div>
                  
                  <div className="space-y-1 mb-3">
                    {order.order_items?.map((item, idx) => (
                      <p key={idx} className="text-sm text-gray-700 font-medium">
                        <span className="font-bold">{item.quantity}x</span> {item.menu_item_name}
                      </p>
                    ))}
                  </div>

                  {order.special_note && (
                    <div className="bg-amber-50 p-3 rounded-xl border border-amber-100">
                      <p className="text-xs font-bold text-amber-800 uppercase">Note from customer</p>
                      <p className="text-sm font-medium text-amber-900">{order.special_note}</p>
                    </div>
                  )}
                </div>

                <div className="w-full sm:w-48 flex flex-col gap-2 border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-5">
                  {activeTab === 'New' && (
                    <>
                      <button onClick={() => handleStatusChange(order.id, 'preparing')} className="w-full bg-[#2563EB] text-white font-bold py-3 rounded-xl hover:bg-blue-700 transition shadow-sm">
                        Accept Order
                      </button>
                      <button onClick={() => handleStatusChange(order.id, 'cancelled')} className="w-full bg-white border-2 border-red-100 text-red-600 font-bold py-2.5 rounded-xl hover:bg-red-50 transition">
                        Reject
                      </button>
                    </>
                  )}
                  {activeTab === 'Preparing' && (
                    <button onClick={() => handleStatusChange(order.id, 'ready')} className="w-full bg-emerald-500 text-white font-bold py-3 rounded-xl hover:bg-emerald-600 transition shadow-sm">
                      Mark as Ready
                    </button>
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
    </div>
  )
}
