'use client'

import { useEffect, useState } from 'react'
import { Settings, Save, Plus, Trash2, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getDeliveryLocations, setDeliveryLocations, getBusyModeAudits, wipeBusyModeAudits } from '@/lib/supabase/queries/admin'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

type AppSettings = {
  id?: string
  rider_mode: boolean
  dine_in_enabled: boolean
  maintenance_mode?: boolean
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    rider_mode: true,
    dine_in_enabled: false,
    maintenance_mode: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [locations, setLocations] = useState<string[]>([])
  const [newLocation, setNewLocation] = useState('')
  const [audits, setAudits] = useState<any[]>([])
  const [isWiping, setIsWiping] = useState(false)

  useEffect(() => {
    async function fetchSettings() {
      try {
        const supabase = createClient()
        const { data, error } = await supabase.from('app_settings').select('*').limit(1).single()
        
        if (error) {
          if (error.code === 'PGRST116') {
            // No rows found, insert default
            const { data: newData, error: insertError } = await supabase
              .from('app_settings')
              .insert({ rider_mode: true, dine_in_enabled: false })
              .select()
              .single()
            if (!insertError && newData) {
              setSettings(newData)
            }
          }
        } else if (data) {
          setSettings(data)
        }

        const locs = await getDeliveryLocations()
        setLocations(locs)

        const auditLogs = await getBusyModeAudits()
        setAudits(auditLogs)
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('app_settings')
        .update({
          rider_mode: settings.rider_mode,
          dine_in_enabled: settings.dine_in_enabled
        })
        .not('rider_mode', 'is', null)

      if (error) throw error

      await setDeliveryLocations(locations)

      toast.success('Global Settings Saved!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const handleWipeAudits = async () => {
    if (!window.confirm("Are you sure you want to permanently delete ALL busy mode audit logs? This action cannot be undone.")) return
    
    setIsWiping(true)
    try {
      await wipeBusyModeAudits()
      setAudits([])
      toast.success("All busy mode audit logs have been wiped.")
    } catch (err: any) {
      toast.error('Failed to wipe audit logs')
    } finally {
      setIsWiping(false)
    }
  }

  const toggleMaintenanceMode = async () => {
    const newValue = !settings.maintenance_mode
    if (newValue === true) {
      // Validate no active orders
      try {
        const supabase = createClient()
        const { data: activeOrders, error } = await supabase
          .from('orders')
          .select('id')
          .not('status', 'in', '("delivered","cancelled")')
          .limit(1)
        
        if (error) throw error
        if (activeOrders && activeOrders.length > 0) {
          toast.error("Cannot enable maintenance mode. There are active orders in the system.")
          return
        }
      } catch (err) {
        toast.error("Failed to check active orders.")
        return
      }
    }

    if (!window.confirm(`Are you sure you want to turn ${newValue ? 'ON' : 'OFF'} Maintenance Mode? ${newValue ? 'This will instantly lock everyone out.' : ''}`)) return

    setIsSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('app_settings')
        .update({ maintenance_mode: newValue })
        .not('rider_mode', 'is', null) // target the single row

      if (error) throw error

      setSettings(s => ({ ...s, maintenance_mode: newValue }))
      toast.success(`Maintenance mode turned ${newValue ? 'ON' : 'OFF'}!`)
    } catch (err) {
      toast.error('Failed to update maintenance mode')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="p-10 font-bold text-white">Loading Settings...</div>

  return (
    <div className="max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
            <Settings className="text-[#F97316]" size={32} />
            Global App Settings
          </h1>
          <p className="text-slate-400 mt-2">Manage global platform toggles (Rider logic, Dine-In modes, etc.)</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-[#F97316] hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Emergency Settings */}
      <div className="bg-[#500724] border border-red-900 rounded-3xl p-6 shadow-xl mb-6">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <AlertCircle size={24} className="text-red-500" />
          Emergency Operations
        </h2>
        
        <div className="flex items-center justify-between p-5 bg-black/40 rounded-2xl border border-red-900/50">
          <div>
            <h3 className="font-bold text-lg text-white">Global Maintenance Mode</h3>
            <p className="text-sm text-red-200 mt-1 max-w-lg">
              When ON, the entire application will be instantly shut down for all students, shops, and riders. They will only see a maintenance screen. <strong>Can only be turned on if there are ZERO active orders.</strong>
            </p>
          </div>
          <button 
            onClick={toggleMaintenanceMode}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ease-in-out shrink-0 ${
              settings.maintenance_mode ? 'bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.7)]' : 'bg-slate-700'
            }`}
          >
            <div 
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                settings.maintenance_mode ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-6 shadow-xl mb-6">
        <h2 className="text-xl font-bold text-white mb-6">Delivery & Rider Modes</h2>
        
        <div className="flex items-center justify-between p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div>
            <h3 className="font-bold text-lg text-white">Rider Mode Enabled</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-lg">
              When ON, students cannot check out without active riders online. 
              When OFF, students can place orders normally and the shop will manually handle the delivery (or it's pickup).
            </p>
          </div>
          <button 
            onClick={() => setSettings(s => ({ ...s, rider_mode: !s.rider_mode }))}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ease-in-out shrink-0 ${
              settings.rider_mode ? 'bg-[#16A34A]' : 'bg-slate-600'
            }`}
          >
            <div 
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                settings.rider_mode ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6">Store Operations</h2>
        
        <div className="flex items-center justify-between p-5 bg-slate-800/50 rounded-2xl border border-slate-700/50">
          <div>
            <h3 className="font-bold text-lg text-white">Dine-In Enabled (Global)</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-lg">
              When ON, the student app will show a toggle for "Dine-In" vs "Delivery" and prompt for a table number.
            </p>
          </div>
          <button 
            onClick={() => setSettings(s => ({ ...s, dine_in_enabled: !s.dine_in_enabled }))}
            className={`relative w-16 h-8 rounded-full transition-colors duration-300 ease-in-out shrink-0 ${
              settings.dine_in_enabled ? 'bg-[#F97316]' : 'bg-slate-600'
            }`}
          >
            <div 
              className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                settings.dine_in_enabled ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-6 shadow-xl mb-6">
        <h2 className="text-xl font-bold text-white mb-6">Preset Delivery Locations</h2>
        <p className="text-sm text-slate-400 mb-4">
          Add locations that will appear in the dropdown for students when they register or change their address.
        </p>
        
        <div className="space-y-3 mb-6">
          {locations.map((loc, idx) => (
            <div key={idx} className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <span className="text-white font-medium">{loc}</span>
              <button 
                onClick={() => setLocations(locations.filter((_, i) => i !== idx))}
                className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-400/10 transition"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
          {locations.length === 0 && (
            <div className="text-slate-500 text-sm text-center py-4 border border-dashed border-slate-700 rounded-xl">
              No delivery locations configured. Students will not be able to register.
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={newLocation}
            onChange={e => setNewLocation(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && newLocation.trim()) {
                setLocations([...locations, newLocation.trim()])
                setNewLocation('')
              }
            }}
            placeholder="e.g. Boys Hostel Block A"
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F97316]"
          />
          <button
            onClick={() => {
              if (newLocation.trim()) {
                setLocations([...locations, newLocation.trim()])
                setNewLocation('')
              }
            }}
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-xl transition flex items-center gap-2"
          >
            <Plus size={18} /> Add
          </button>
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-6 shadow-xl mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle size={20} className="text-orange-500" /> Shop Busy Mode Audits
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Track when shop owners toggle "Busy Mode" (+10 mins ETA). To prevent database bloat and abuse, you can wipe these logs instantly.
            </p>
          </div>
          <button
            onClick={handleWipeAudits}
            disabled={isWiping || audits.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={16} /> {isWiping ? 'Wiping...' : 'Wipe Audit Logs'}
          </button>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
          {audits.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No audit logs found. Database is clean.</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-800 text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">Shop Name</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Toggled By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {audits.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 whitespace-nowrap">{formatDate(log.created_at)}</td>
                      <td className="px-4 py-3 font-bold text-white">{log.shops?.name || 'Unknown'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${log.is_busy ? 'bg-orange-500/20 text-orange-400' : 'bg-slate-600/50 text-slate-300'}`}>
                          {log.is_busy ? 'Turned ON (+10m)' : 'Turned OFF'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.profiles?.full_name || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="bg-[#1E293B] border border-slate-800 rounded-3xl p-6 shadow-xl mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle size={20} className="text-blue-500" /> Order Audit Logs (Cleanup)
            </h2>
            <p className="text-sm text-slate-400 max-w-2xl">
              Clear ALL order history tracking logs (state changes). This will free up database space but will not affect your actual orders or revenue stats.
            </p>
          </div>
          <button
            onClick={async () => {
              if (!window.confirm("Are you sure you want to permanently delete ALL order audit logs?")) return
              try {
                const res = await fetch('/api/admin/wipe-audit-logs', { method: 'POST' })
                if (!res.ok) throw new Error('Failed to wipe logs')
                toast.success("All order audit logs wiped.")
              } catch (err: any) {
                toast.error("Failed to wipe order audit logs")
              }
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition flex items-center gap-2"
          >
            <Trash2 size={16} /> Clear All Order Logs
          </button>
        </div>
      </div>

    </div>
  )
}
