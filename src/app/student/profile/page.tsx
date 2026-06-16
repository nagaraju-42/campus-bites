'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, User as UserIcon, Settings, Heart, HelpCircle, ChevronRight, FileText, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'
import { updateStudentProfileServer } from './actions'

export default function StudentProfilePage() {
  const router = useRouter()
  const { user, setUser, studentProfile, setStudentProfile } = useAuthStore()

  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [deliveryLocations, setDeliveryLocations] = useState<string[]>([])
  const [isCustomAddress, setIsCustomAddress] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    hostel_name: '',
    room_number: ''
  })

  useEffect(() => {
    async function loadLocations() {
      const supabase = createClient()
      const { data } = await supabase.from('app_settings').select('value').eq('key', 'delivery_locations').single()
      if (data && data.value) {
        try {
          setDeliveryLocations(JSON.parse(data.value))
        } catch(e) {}
      }
    }
    loadLocations()
  }, [])

  const handleOpenEdit = () => {
    const currentHostel = studentProfile?.hostel_name || ''
    setEditForm({
      full_name: user?.full_name || '',
      hostel_name: currentHostel,
      room_number: studentProfile?.room_number || ''
    })
    setIsCustomAddress(currentHostel ? !deliveryLocations.includes(currentHostel) : false)
    setIsEditing(true)
  }

  const handleSaveProfile = async () => {
    if (!editForm.full_name.trim() || !editForm.hostel_name) {
      toast.error('Name and Delivery Location are required')
      return
    }
    setIsSaving(true)
    try {
      await updateStudentProfileServer(
        user!.id,
        editForm.full_name.trim(),
        editForm.hostel_name,
        editForm.room_number.trim() || 'N/A'
      )

      setUser({ ...user!, full_name: editForm.full_name.trim() })
      setStudentProfile({ 
        ...studentProfile!, 
        hostel_name: editForm.hostel_name, 
        room_number: editForm.room_number.trim() || 'N/A' 
      })

      toast.success('Profile updated!')
      setIsEditing(false)
    } catch (err) {
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

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
      <div className="bg-[#EAB308] pt-3 pb-8 px-6 rounded-b-3xl shadow-md">
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
            <button onClick={handleOpenEdit} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-yellow-50 transition text-left">
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
            <button onClick={() => router.push('/contact')} className="w-full flex items-center justify-between p-4 border-b border-gray-50 hover:bg-yellow-50 transition text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-50 text-gray-600 rounded-full flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <span className="font-bold text-gray-900">Contact Support</span>
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
          DineNDeliver v1.0.0
        </p>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 text-lg">Edit Profile</h3>
              <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-900 transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Full Name</label>
                <input 
                  type="text"
                  value={editForm.full_name}
                  onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-[#EAB308]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Phone Number <span className="text-red-400 font-normal">(Contact Support to change)</span></label>
                <input 
                  type="text"
                  value={user.phone || ''}
                  disabled
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-500 cursor-not-allowed"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-500">
                    {isCustomAddress ? 'Custom Delivery Location' : 'Preset Delivery Location'}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomAddress(!isCustomAddress)
                      setEditForm({ ...editForm, hostel_name: '' })
                    }}
                    className="text-xs font-bold text-[#CA8A04] hover:text-yellow-800 transition"
                  >
                    {isCustomAddress ? 'Choose Preset' : 'Enter Custom'}
                  </button>
                </div>
                {isCustomAddress ? (
                  <input
                    type="text"
                    value={editForm.hostel_name}
                    placeholder="e.g. My Custom Block"
                    onChange={e => setEditForm({...editForm, hostel_name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-[#EAB308]"
                  />
                ) : (
                  <select
                    value={editForm.hostel_name}
                    onChange={e => setEditForm({...editForm, hostel_name: e.target.value})}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-[#EAB308]"
                  >
                    <option value="" disabled>Select your location</option>
                    {deliveryLocations.map((loc, idx) => (
                      <option key={idx} value={loc}>{loc}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Room Number / Block (Optional)</label>
                <input 
                  type="text"
                  value={editForm.room_number}
                  onChange={e => setEditForm({...editForm, room_number: e.target.value})}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-gray-900 focus:outline-none focus:border-[#EAB308]"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3 bg-gray-50">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex-1 bg-[#EAB308] text-white font-bold py-3 rounded-xl hover:bg-[#CA8A04] transition shadow-md disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
