'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useRiderStore } from '@/store/riderStore'
import PoolCard from '@/components/rider/PoolCard'

import { useEffect, useState } from 'react'
import { Bell } from 'lucide-react'

export default function ActiveDeliveriesPage() {
  const router = useRouter()
  const { activeDeliveries } = useRiderStore()
  const [timeLeft, setTimeLeft] = useState(300)
  const [showCollectionPrompt, setShowCollectionPrompt] = useState(false)

  useEffect(() => {
    if (activeDeliveries.length > 0) {
      const batchId = activeDeliveries.map(o => o.id).sort().join('-')
      let claimTime = localStorage.getItem(`batch_${batchId}`)
      if (!claimTime) {
        claimTime = new Date().getTime().toString()
        localStorage.setItem(`batch_${batchId}`, claimTime)
      }
      const oldestUpdate = parseInt(claimTime)
      const now = new Date().getTime()
      const elapsedSeconds = Math.floor((now - oldestUpdate) / 1000)
      const initialTimeLeft = Math.max(300 - elapsedSeconds, 0)
      setTimeLeft(initialTimeLeft)

      const timer = setInterval(() => {
        setTimeLeft(prev => prev > 0 ? prev - 1 : 0)
      }, 1000)
      return () => clearInterval(timer)
    } else {
      setTimeLeft(300)
    }
  }, [activeDeliveries.length])

  useEffect(() => {
    if (timeLeft === 0 && activeDeliveries.length > 0 && !showCollectionPrompt) {
      const batchId = activeDeliveries.map(o => o.id).sort().join('-')
      if (!localStorage.getItem(`prompted_${batchId}`)) {
        setShowCollectionPrompt(true)
        const { playRiderAlarm } = require('@/store/riderStore')
        playRiderAlarm()
      }
    }
  }, [timeLeft, activeDeliveries, showCollectionPrompt])

  const handleAcknowledgeCollection = () => {
    const batchId = activeDeliveries.map(o => o.id).sort().join('-')
    localStorage.setItem(`prompted_${batchId}`, 'true')
    setShowCollectionPrompt(false)
    const { stopRiderAlarm } = require('@/store/riderStore')
    stopRiderAlarm()
  }

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
      {/* Collection Prompt Overlay */}
      <AnimatePresence>
        {showCollectionPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                <Bell size={32} className="animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Time is up!</h2>
              <p className="text-gray-600 mb-6 text-sm">
                The 5-minute collection window has ended. Did you collect all the items from the shop?
              </p>
              <button
                onClick={handleAcknowledgeCollection}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg active:scale-95 transition"
              >
                Yes, I collected them!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Active Deliveries</h1>
          <p className="text-gray-500 font-medium text-sm">You have {activeDeliveries.length} orders in your batch.</p>
        </div>
        <div className={`p-2 rounded-lg border ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'} shadow-sm`}>
          <div className="text-xl font-mono font-bold tracking-widest text-center">
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
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
