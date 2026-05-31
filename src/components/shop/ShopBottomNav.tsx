'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Monitor, Utensils, Settings } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/shop/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/shop/orders', label: 'Orders', Icon: ClipboardList },
  { href: '/shop/kds', label: 'KDS', Icon: Monitor },
  { href: '/shop/menu', label: 'Menu', Icon: Utensils },
  { href: '/shop/settings', label: 'Settings', Icon: Settings },
]

export default function ShopBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50 md:hidden">
      <div className="flex items-center justify-around h-16 px-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-1 flex-1 py-1">
              <div className="relative">
                <Icon
                  size={22}
                  className={isActive ? 'text-[#2563EB]' : 'text-gray-400 hover:text-gray-600 transition-colors'}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={`text-[10px] font-bold ${isActive ? 'text-[#2563EB]' : 'text-gray-400'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
