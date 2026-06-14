'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCartStore } from '@/store/cartStore'
import {
  NavHomeIcon,
  NavSearchIcon,
  NavOrdersIcon,
  NavOffersIcon,
  NavProfileIcon,
} from '../icons/CustomIcons'

const NAV_ITEMS = [
  { href: '/student/home',    label: 'Home',    Key: 'home' },
  { href: '/student/orders',  label: 'Orders',  Key: 'orders' },
  { href: '/student/cart',    label: 'Cart',    Key: 'cart',  showBadge: true },
  { href: '/student/offers',  label: 'Offers',  Key: 'offers' },
  { href: '/student/profile', label: 'Profile', Key: 'profile' },
]

function NavIcon({ navKey, active }: { navKey: string; active: boolean }) {
  switch (navKey) {
    case 'home':    return <NavHomeIcon active={active} className="w-6 h-6" />
    case 'orders':  return <NavOrdersIcon active={active} className="w-6 h-6" />
    case 'cart':    return <NavOrdersIcon active={active} className="w-6 h-6" />
    case 'offers':  return <NavOffersIcon active={active} className="w-6 h-6" />
    case 'profile': return <NavProfileIcon active={active} className="w-6 h-6" />
    default:        return <NavSearchIcon active={active} className="w-6 h-6" />
  }
}

export default function StudentBottomNav() {
  const pathname = usePathname()
  const totalItems = useCartStore((s) => s.getTotalItems())

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto bg-white border-t border-gray-100 z-50">
      <div className="flex items-center justify-around h-[60px] px-1">
        {NAV_ITEMS.map(({ href, label, Key, showBadge }) => {
          const isActive = pathname.startsWith(href)
          const cartCount = totalItems

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-[3px] flex-1 py-2 min-w-0 relative"
            >
              <div className={`relative p-1.5 rounded-full transition-all duration-200 ${isActive ? 'bg-[#FFF0E6]' : ''}`}>
                <NavIcon navKey={Key} active={isActive} />
                {/* Cart badge */}
                {showBadge && cartCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] bg-[#EA580C] rounded-full text-white text-[8px] flex items-center justify-center font-bold px-0.5 leading-none">
                    {cartCount > 9 ? '9+' : cartCount}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold leading-none transition-colors ${isActive ? 'text-[#EA580C]' : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
