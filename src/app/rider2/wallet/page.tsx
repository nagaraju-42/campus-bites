'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Wallet } from 'lucide-react'

export default function Rider2WalletPage() {
  const { user } = useAuthStore()
  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Fetch delivered today
  useEffect(() => {
    if (!user) return
    async function fetchDelivered() {
      const supabase = createClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          shops(name),
          order_items(*, partner:partner_shop_id(name))
        `)
        .eq('rider_id', user!.id)
        .eq('status', 'delivered')
        .gte('placed_at', today.toISOString())
        .order('placed_at', { ascending: false })
      
      if (data) setDeliveredOrders(data)
      setIsLoading(false)
    }
    fetchDelivered()
  }, [user])

  if (isLoading) {
    return (
      <div className="px-5 pt-10 text-center text-gray-500 font-bold">
        Loading wallet...
      </div>
    )
  }

  return (
    <div className="px-5 pt-8 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-green-600">
          <Wallet size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Wallet</h1>
          <p className="text-gray-500 font-medium text-sm">Today's Collections</p>
        </div>
      </div>

      {deliveredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-gray-200 mt-6 shadow-sm">
          <p className="text-5xl mb-4">💸</p>
          <h3 className="font-bold text-gray-900 text-lg mb-2">No Cash Collected</h3>
          <p className="text-gray-500 text-sm">Complete deliveries to see your collection breakdown here.</p>
        </div>
      ) : (
        <>
          {/* Today's Collections Breakdown */}
          <div className="bg-green-50 border border-green-200 rounded-2xl p-5 shadow-sm mb-6">
            <h2 className="font-bold text-green-900 mb-3 flex items-center gap-2">
              <span className="text-xl">💰</span> Collection Breakdown
            </h2>
            {(() => {
              let totalCash = 0;
              let primaryCash = 0;
              let secondaryCash = 0;
              let deliveryFees = 0;
              const secondaryBreakdown: Record<string, number> = {};
              let nonCashCount = 0;

              deliveredOrders.forEach((order: any) => {
                if (order.payment_method !== 'cash_on_delivery') {
                  nonCashCount++;
                  return;
                }
                
                const fee = order.delivery_fee || 10;
                deliveryFees += fee;
                totalCash += order.total_amount;

                // Parse items
                const items = order.order_items || [];
                items.forEach((item: any) => {
                  if (item.item_name && item.item_name.startsWith('[UNAVAILABLE]')) return;
                  const amount = item.quantity * (item.unit_price || 0);
                  if (item.partner_shop_id && item.partner_shop_id !== order.shop_id) {
                    secondaryCash += amount;
                    const partnerName = item.partner?.name || 'Partner Shop';
                    secondaryBreakdown[partnerName] = (secondaryBreakdown[partnerName] || 0) + amount;
                  } else {
                    primaryCash += amount;
                  }
                });
              });

              return (
                <div className="space-y-2 text-sm text-green-800">
                  <div className="flex justify-between border-b border-green-200/50 pb-1">
                    <span>Primary Shop Collection:</span>
                    <span className="font-bold">{formatCurrency(primaryCash)}</span>
                  </div>
                  {Object.entries(secondaryBreakdown).map(([name, amt]) => (
                    <div key={name} className="flex justify-between border-b border-green-200/50 pb-1">
                      <span>{name} Collection:</span>
                      <span className="font-bold">{formatCurrency(amt)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-b border-green-200/50 pb-1">
                    <span>Delivery Fees (for Primary):</span>
                    <span className="font-bold">{formatCurrency(deliveryFees)}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="font-bold uppercase tracking-wider text-green-900 text-xs">Total Cash to Hand Over:</span>
                    <span className="font-bold text-lg text-green-700">{formatCurrency(totalCash)}</span>
                  </div>
                  {nonCashCount > 0 && (
                    <p className="text-[10px] text-green-600/70 mt-2 font-medium italic">
                      * Excludes {nonCashCount} prepaid/UPI order(s)
                    </p>
                  )}
                </div>
              )
            })()}
          </div>

          <h2 className="font-bold text-gray-900 mb-4">Cash Order History Today</h2>
          <div className="space-y-3">
            {deliveredOrders.filter(o => o.payment_method === 'cash_on_delivery').map(order => (
              <div key={order.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Order #{order.order_number}</h3>
                  <p className="text-xs text-gray-500 mt-1">{new Date(order.placed_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' })}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-green-600 block">{formatCurrency(order.total_amount)}</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Cash Collected</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}