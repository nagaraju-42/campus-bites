'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, ShoppingCart, User } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'

const NAV_ITEMS = [
  { href: '/student/home',   label: 'Home',   Icon: Home, activeColor: 'text-[#EAB308]' },
  { href: '/student/orders', label: 'Orders', Icon: ClipboardList, activeColor: 'text-[#16A34A]' },
  { href: '/student/cart',   label: 'Cart',   Icon: ShoppingCart, activeColor: 'text-[#6D28D9]' },
  { href: '/student/profile',label: 'Profile',Icon: User, activeColor: 'text-gray-900' },
]

export default function StudentBottomNav() {
  const pathname = usePathname()
  const totalItems = useCartStore((s) => s.getTotalItems())

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-[400px] bg-white/80 backdrop-blur-2xl border border-white/40 shadow-2xl rounded-3xl z-50 overflow-hidden">
      <div className="flex items-center justify-around h-16 px-4">
        {NAV_ITEMS.map(({ href, label, Icon, activeColor }) => {
          const isActive = pathname.startsWith(href)
          const isCart = label === 'Cart'
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 flex-1 py-1">
              <div className="relative">
                <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-gray-100/50 scale-110' : 'hover:bg-gray-50'}`}>
                  <Icon
                    size={22}
                    className={isActive ? activeColor : 'text-gray-400 transition-colors'}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </div>
                {isCart && totalItems > 0 && (
                  <span className="absolute 1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold shadow-lg border-2 border-white/80">
                    {totalItems > 9 ? '9+' : totalItems}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold mt-0.5 transition-all duration-300 ${isActive ? activeColor : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
