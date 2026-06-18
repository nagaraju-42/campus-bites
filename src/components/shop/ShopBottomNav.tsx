'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardList, Monitor, Utensils, Settings, Banknote, FileText, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/shop/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { href: '/shop/orders', label: 'Orders', Icon: ClipboardList },
  { href: '/shop/kds', label: 'KDS', Icon: Monitor },
  { href: '/shop/menu', label: 'Menu', Icon: Utensils },
  { href: '/shop/settlements', label: 'Settlements', Icon: Banknote },
  { href: '/shop/reports', label: 'Reports', Icon: FileText },
  { href: '/shop/contacts', label: 'Riders', Icon: Users },
  { href: '/shop/settings', label: 'Settings', Icon: Settings },
]

export default function ShopBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-100 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] z-50 md:hidden pb-safe">
      <div className="flex items-center gap-6 h-20 px-6 overflow-x-auto hide-scrollbar touch-pan-x">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href)
          return (
            <Link key={href} href={href} className="flex flex-col items-center justify-center gap-1.5 min-w-[64px] flex-shrink-0">
              <div className={`relative p-2.5 rounded-xl transition-colors ${isActive ? 'bg-blue-50 text-[#2563EB]' : 'text-gray-400 hover:bg-gray-50'}`}>
                <Icon
                  size={24}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span className={`text-[11px] font-bold ${isActive ? 'text-[#2563EB]' : 'text-gray-500'}`}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
