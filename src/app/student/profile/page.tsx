'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User as UserIcon, Settings, Heart, HelpCircle, ChevronRight, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function StudentProfilePage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()

  const handleLogout = async () => {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      setUser(null)
      toast.success('Logged out successfully')
      router.replace('/login')
    } catch (err) {
      toast.error('Failed to log out')
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-[#FEFCE8] pb-24">
      {/* Header Profile Section */}
      <div className="bg-[#EAB308] pt-12 pb-8 px-6 rounded-b-3xl shadow-md">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#EAB308] shadow-inner text-3xl">
            {user.full_name?.charAt(0).toUpperCase() || <UserIcon size={32} />}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-900">{user.full_name}</h1>
            <p className="text-yellow-900 font-medium">{user.email}</p>
            <span className="inline-block mt-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-500">
              Verified Student
            </span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-8 space-y-6">
        {/* Account Section */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Account Settings</h2>
          <div className="bg-white rounded-2xl border border-yellow-100 shadow-sm overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-yellow-50 transition text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-50 text-[#EAB308] rounded-full flex items-center justify-center">
                  <UserIcon size={20} />
                </div>
                <span className="font-bold text-gray-900">Personal Information</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-yellow-50 transition text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-50 text-[#EAB308] rounded-full flex items-center justify-center">
                  <Settings size={20} />
                </div>
                <span className="font-bold text-gray-900">Preferences</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-yellow-50 transition text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-50 text-[#EAB308] rounded-full flex items-center justify-center">
                  <Heart size={20} />
                </div>
                <span className="font-bold text-gray-900">Favorite Shops</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Support Section */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Support & Legal</h2>
          <div className="bg-white rounded-2xl border border-yellow-100 shadow-sm overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-yellow-50 transition text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <span className="font-bold text-gray-900">Help Center</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
            <button className="w-full flex items-center justify-between p-4 hover:bg-yellow-50 transition text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <span className="font-bold text-gray-900">Terms of Service</span>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>
        </div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="w-full bg-white border-2 border-red-100 text-red-500 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 transition active:scale-95 shadow-sm"
        >
          <LogOut size={20} />
          Log Out Securely
        </button>

        <p className="text-center text-xs text-gray-400 font-medium">
          CampusBites v1.0.0
        </p>
      </div>
    </div>
  )
}
