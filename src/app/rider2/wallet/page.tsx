'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'
import { Wallet, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Rider2WalletPage() {
  const { user } = useAuthStore()
  const [deliveredOrders, setDeliveredOrders] = useState<any[]>([])
  const [settlements, setSettlements] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch delivered today and settlements
  const fetchWalletData = async () => {
    if (!user) return
    const supabase = createClient()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const [ordersRes, settlementsRes] = await Promise.all([
      supabase
        .from('orders')
        .select(`
          *,
          shops(name),
          order_items(*, partner:partner_shop_id(name))
        `)
        .eq('rider_id', user!.id)
        .eq('status', 'delivered')
        .gte('placed_at', today.toISOString())
        .order('placed_at', { ascending: false }),
      supabase
        .from('rider_settlements')
        .select('*')
        .eq('rider_id', user!.id)
        .eq('date', today.toISOString().slice(0, 10))
    ])
    
    if (ordersRes.data) setDeliveredOrders(ordersRes.data)
    if (settlementsRes.data) setSettlements(settlementsRes.data)
    setIsLoading(false)
  }

  useEffect(() => {
    fetchWalletData()
  }, [user])

  const pendingHandoffs = settlements.filter(s => s.status === 'pending')
  const approvedHandoffs = settlements.filter(s => s.status === 'approved')

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

  const totalHandedOver = settlements.reduce((sum, s) => sum + Number(s.amount), 0)
  const netCashToHandOver = Math.max(0, totalCash - totalHandedOver)

  const handleRequestHandoff = async () => {
    if (netCashToHandOver <= 0) return
    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const todayDateStr = new Date().toISOString().slice(0, 10)
      
      const { error } = await supabase.from('rider_settlements').insert({
        shop_id: deliveredOrders[0].shop_id,
        rider_id: user!.id,
        amount: netCashToHandOver,
        date: todayDateStr,
        status: 'pending'
      })

      if (error) throw error
      toast.success('Handoff requested! Waiting for shop owner to approve.')
      await fetchWalletData()
    } catch (err: any) {
      toast.error(err.message || 'Failed to request handoff')
    } finally {
      setIsSubmitting(false)
    }
  }

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
            {/* Status of Handoffs */}
            {pendingHandoffs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-green-200/50">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2">Pending Handoffs</p>
                {pendingHandoffs.map(h => (
                  <div key={h.id} className="flex justify-between items-center text-sm font-medium text-amber-800 bg-amber-50 p-2 rounded-lg mb-2">
                    <span className="flex items-center gap-1"><Clock size={14}/> Waiting for Approval</span>
                    <span className="font-bold">{formatCurrency(h.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            
            {approvedHandoffs.length > 0 && (
              <div className="mt-4 pt-4 border-t border-green-200/50">
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2">Approved Handoffs (Settled)</p>
                {approvedHandoffs.map(h => (
                  <div key={h.id} className="flex justify-between items-center text-sm font-medium text-green-800 bg-green-100/50 p-2 rounded-lg mb-2">
                    <span>Settled</span>
                    <span className="font-bold">{formatCurrency(h.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Request Button */}
            <div className="mt-6">
              <button 
                onClick={handleRequestHandoff}
                disabled={netCashToHandOver <= 0 || isSubmitting}
                className={`w-full py-3 rounded-xl font-bold text-white shadow-sm transition active:scale-95 ${
                  netCashToHandOver <= 0 
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500' 
                    : 'bg-[#16A34A] hover:bg-green-600 shadow-green-500/30 shadow-lg'
                }`}
              >
                {isSubmitting ? 'Submitting...' : `Hand Over ${formatCurrency(netCashToHandOver)}`}
              </button>
            </div>
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