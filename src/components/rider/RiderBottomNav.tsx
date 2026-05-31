'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Navigation, Wallet, User } from 'lucide-react'
import { useRiderStore } from '@/store/riderStore'

const NAV_ITEMS = [
  { href: '/rider/pool', label: 'Pool', Icon: Map },
  { href: '/rider/delivery/current', label: 'Active', Icon: Navigation },
  { href: '/rider/earnings', label: 'Earnings', Icon: Wallet },
  { href: '/rider/profile', label: 'Profile', Icon: User },
]

export default function RiderBottomNav() {
  const pathname = usePathname()
  const { activeDeliveries, availableOrders } = useRiderStore()

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50">
      <div className="flex items-center justify-around h-16 px-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          // Special logic for Active route
          const isCurrentDeliveryRoute = label === 'Active'
          const actualHref = isCurrentDeliveryRoute ? '/rider/active' : href

          const isActive = pathname.startsWith(isCurrentDeliveryRoute ? '/rider/active' : href) || pathname.startsWith('/rider/delivery')
          const isDisabled = isCurrentDeliveryRoute && activeDeliveries.length === 0
          const showBadge = label === 'Pool' && availableOrders.length > 0

          return (
            <Link 
              key={href} 
              href={isDisabled ? '#' : actualHref} 
              className={`flex flex-col items-center gap-1 flex-1 py-1 ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="relative">
                <Icon
                  size={24}
                  className={isActive ? 'text-[#16A34A]' : 'text-gray-400'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold border-2 border-white">
                    {availableOrders.length}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-[#16A34A]' : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
