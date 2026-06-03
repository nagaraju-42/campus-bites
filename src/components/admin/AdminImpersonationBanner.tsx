'use client'

import { useRouter } from 'next/navigation'
import { EyeOff, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useShopOrdersStore } from '@/store/shopOrdersStore'

export default function AdminImpersonationBanner() {
  const router = useRouter()
  const { adminUser, setAdminUser, setUser } = useAuthStore()
  const { setShopId } = useShopOrdersStore()

  if (!adminUser) return null

  const handleStopImpersonating = () => {
    // Restore admin session
    setUser(adminUser)
    setAdminUser(null)
    setShopId(null)
    router.push('/admin/shops')
  }

  return (
    <div className="bg-red-600 text-white px-4 py-2 flex items-center justify-between shadow-md z-50 relative">
      <div className="flex items-center gap-2">
        <ShieldAlert size={18} />
        <p className="text-sm font-bold tracking-wide">
          ADMIN IMPERSONATION MODE
        </p>
      </div>
      
      <button 
        onClick={handleStopImpersonating}
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-xs font-bold transition"
      >
        <EyeOff size={14} />
        Return to Admin
      </button>
    </div>
  )
}
