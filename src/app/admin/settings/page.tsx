'use client'

import { useEffect, useState } from 'react'
import { Settings, Save, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getDeliveryLocations, setDeliveryLocations } from '@/lib/supabase/queries/admin'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

type AppSettings = {
  id?: string
  rider_mode: boolean
  dine_in_enabled: boolean
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    rider_mode: true,
    dine_in_enabled: false
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [locations, setLocations] = useState<string[]>([])
  const [newLocation, setNewLocation] = useState('')

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

    </div>
  )
}
