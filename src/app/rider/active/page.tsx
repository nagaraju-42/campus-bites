'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useRiderStore } from '@/store/riderStore'
import PoolCard from '@/components/rider/PoolCard'

import { useEffect } from 'react'

export default function ActiveDeliveriesPage() {
  const router = useRouter()
  const { activeDeliveries } = useRiderStore()

  // Removed auto-redirect to allow riders to view batch management page

  if (activeDeliveries.length === 0) {
    return (
      <div className="px-5 pt-8 pb-4 text-center">
        <h1 className="text-2xl font-display font-bold text-gray-900 mb-6">Active Deliveries</h1>
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 mt-10">
          <p className="text-5xl mb-4">📭</p>
          <h3 className="font-bold text-gray-900 text-lg mb-2">No Active Deliveries</h3>
          <p className="text-gray-500 text-sm">Head back to the pool to claim some orders.</p>
          <button 
            onClick={() => router.push('/rider/pool')}
            className="mt-6 bg-[#16A34A] text-white font-bold py-2 px-6 rounded-xl"
          >
            Go to Pool
          </button>
        </div>
      </div>
    )
  }

  // Allow rendering even if there is only 1 delivery

  return (
    <div className="px-5 pt-8 pb-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-gray-900">Active Deliveries</h1>
        <p className="text-gray-500 font-medium text-sm">You have {activeDeliveries.length} orders in your batch.</p>
      </div>

      <div className="space-y-4 relative">
        <AnimatePresence>
          {activeDeliveries.map(order => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", bounce: 0.3 }}
            >
              <div 
                onClick={() => router.push(`/rider/delivery/${order.id}`)}
                className="cursor-pointer"
              >
                <div className="bg-white rounded-2xl p-4 shadow-sm border-2 border-transparent hover:border-[#16A34A] transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-lg">{order.order_number}</p>
                      <p className="text-gray-500 text-sm font-medium">{order.shops?.name}</p>
                      {order.order_items?.some((i: any) => i.partner_shop_id) && (
                        <p className="text-xs text-[#F97316] font-bold mt-0.5">
                          + Pickup from: {order.order_items.find((i: any) => i.partner_shop_id)?.partner?.name}
                        </p>
                      )}
                    </div>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider text-green-700 bg-green-100 border border-green-200">
                      Deliver This
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-md">
                      Hostel: {order.hostel_name} ({order.room_number})
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
