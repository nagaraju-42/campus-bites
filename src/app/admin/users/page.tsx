'use client'

import { useEffect, useState } from 'react'
import { Ban, CheckCircle, Search, Mail, MapPin, Trash2, Edit2, X } from 'lucide-react'
import { getAllUsers, updateUserStatus, hardDeleteUser, updateUserProfile, getDeliveryLocations } from '@/lib/supabase/queries/admin'
import toast from 'react-hot-toast'

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('all')

  const [editUser, setEditUser] = useState<any>(null)
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', hostel_name: '', room_number: '' })
  const [deliveryLocations, setDeliveryLocations] = useState<string[]>([])
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAllUsers()
        setUsers(data)
        const locs = await getDeliveryLocations()
        setDeliveryLocations(locs)
      } catch (err) {
        console.error("Failed to load users", err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const filteredUsers = users.filter(u => 
    (filterRole === 'all' || u.role === filterRole) &&
    (u.full_name?.toLowerCase().includes(search.toLowerCase()) || 
     u.email?.toLowerCase().includes(search.toLowerCase()))
  )

  const toggleSuspend = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
    
    // Optimistic UI update
    setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u))
    
    try {
      await updateUserStatus(id, newStatus)
      toast.success(newStatus === 'suspended' ? 'User has been suspended.' : 'User has been reinstated.')
    } catch (err) {
      toast.error('Failed to update status.')
      // Revert on failure
      setUsers(users.map(u => u.id === id ? { ...u, status: currentStatus } : u))
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('WARNING: This will permanently delete this user, their shop, and all their orders from the database. Are you sure?')) return
    
    try {
      await hardDeleteUser(id)
      setUsers(users.filter(u => u.id !== id))
      toast.success('User permanently deleted.')
    } catch (err: any) {
      toast.error('Failed to delete user: ' + err.message)
    }
  }

  const handleOpenEdit = (user: any) => {
    setEditUser(user)
    setEditForm({
      full_name: user.full_name || '',
      phone: user.phone || '',
      hostel_name: user.student_profiles?.hostel_name || '',
      room_number: user.student_profiles?.room_number || ''
    })
  }

  const handleSaveEdit = async () => {
    setIsSavingEdit(true)
    try {
      const updates = { full_name: editForm.full_name, phone: editForm.phone }
      const studentUpdates = editUser.role === 'student' ? { hostel_name: editForm.hostel_name, room_number: editForm.room_number } : null
      
      await updateUserProfile(editUser.id, editUser.role, updates, studentUpdates)
      
      setUsers(users.map(u => {
        if (u.id === editUser.id) {
          return {
            ...u,
            full_name: editForm.full_name,
            phone: editForm.phone,
            student_profiles: u.student_profiles ? {
              ...u.student_profiles,
              hostel_name: editForm.hostel_name,
              room_number: editForm.room_number
            } : null
          }
        }
        return u
      }))
      
      toast.success('User updated successfully')
      setEditUser(null)
    } catch (e: any) {
      toast.error(e.message || 'Failed to update user')
    } finally {
      setIsSavingEdit(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-wide">User Moderation</h1>
          <p className="text-slate-400 mt-1">Manage Students and Delivery Partners</p>
        </div>
        <button 
          onClick={() => window.location.href = '/admin/users/create'}
          className="bg-[#F97316] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-orange-500/20 transition flex items-center gap-2"
        >
          <span className="text-xl leading-none">+</span> Add New User
        </button>
      </div>

      <div className="bg-[#1E293B] rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-slate-700/50 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder="Search users..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316]"
            />
          </div>
          <select 
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-[#0F172A] border border-slate-700 text-white focus:outline-none focus:border-[#F97316] font-bold"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="rider">Riders</option>
            <option value="shop_owner">Shop Owners</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0F172A] border-b border-slate-700 text-slate-400 text-xs uppercase tracking-wider font-bold">
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {isLoading ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">Loading users...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-10 text-center text-slate-500">No users found.</td></tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-800/50 transition">
                    <td className="px-6 py-4">
                      <p className="font-bold text-white">{user.full_name}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                        <span className="flex items-center gap-1"><Mail size={12}/> {user.email}</span>
                        {user.student_profiles?.college_name && (
                          <span className="flex items-center gap-1"><MapPin size={12}/> {user.student_profiles.college_name}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        user.role === 'student' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        user.role === 'rider' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`flex items-center gap-1.5 text-xs font-bold ${user.status === 'suspended' ? 'text-red-400' : 'text-emerald-400'}`}>
                        {user.status === 'suspended' ? <Ban size={14}/> : <CheckCircle size={14}/>}
                        {user.status === 'suspended' ? 'Suspended' : 'Active'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(user)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition flex items-center gap-1"
                        >
                          <Edit2 size={14} /> Edit
                        </button>
                        <button 
                          onClick={() => toggleSuspend(user.id, user.status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                            user.status === 'suspended' ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20' : 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
                          }`}
                        >
                          {user.status === 'suspended' ? 'Reinstate' : 'Suspend'}
                        </button>
                        <button 
                          onClick={() => handleDelete(user.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition flex items-center gap-1"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editUser && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-700">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                Edit User Details
              </h3>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-white transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Full Name</label>
                <input 
                  type="text"
                  value={editForm.full_name}
                  onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Phone Number (Admin Override)</label>
                <input 
                  type="text"
                  value={editForm.phone}
                  onChange={e => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#F97316]"
                />
              </div>

              {editUser.role === 'student' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Hostel / Address</label>
                    <select
                      value={editForm.hostel_name}
                      onChange={e => setEditForm({...editForm, hostel_name: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#F97316]"
                    >
                      <option value="">No Location Selected</option>
                      {deliveryLocations.map((loc, idx) => (
                        <option key={idx} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Room Number / Floor</label>
                    <input 
                      type="text"
                      value={editForm.room_number}
                      onChange={e => setEditForm({...editForm, room_number: e.target.value})}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#F97316]"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex gap-3 bg-slate-800/50">
              <button 
                onClick={() => setEditUser(null)}
                className="flex-1 bg-slate-700 text-white font-bold py-2.5 rounded-xl hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSavingEdit}
                className="flex-1 bg-[#F97316] text-white font-bold py-2.5 rounded-xl hover:bg-orange-600 transition disabled:opacity-50"
              >
                {isSavingEdit ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
