'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Smartphone, Monitor, ShieldAlert } from 'lucide-react'
import toast from 'react-hot-toast'

export default function PushTestPage() {
  const [subscriptions, setSubscriptions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscriptions()
  }, [])

  async function fetchSubscriptions() {
    const supabase = createClient()
    
    // We fetch subscriptions and join with profiles to get the user's name/role
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select(`
        *,
        profile:profiles!push_subscriptions_user_id_fkey(full_name, role, email)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      toast.error('Failed to load subscriptions')
      console.error(error)
    } else {
      setSubscriptions(data || [])
    }
    setLoading(false)
  }

  // Helper to guess device type from push endpoint URL
  const getDeviceType = (endpoint: string) => {
    if (endpoint.includes('fcm.googleapis.com')) return { name: 'Android / Chrome', icon: Smartphone, color: 'text-green-500' }
    if (endpoint.includes('push.apple.com')) return { name: 'iOS / Safari', icon: Smartphone, color: 'text-blue-500' }
    if (endpoint.includes('mozilla.com')) return { name: 'Firefox', icon: Monitor, color: 'text-orange-500' }
    if (endpoint.includes('windows.com')) return { name: 'Windows Edge', icon: Monitor, color: 'text-cyan-500' }
    return { name: 'Unknown Device', icon: Monitor, color: 'text-slate-400' }
  }

  const handleTestPush = async (userId: string) => {
    try {
      const res = await fetch('/api/push/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: '🛠️ Test Notification',
          body: 'If you see this, background push is working perfectly!',
          url: '/'
        })
      })
      
      const data = await res.json()
      if (res.ok) {
        toast.success('Test push sent successfully!')
      } else {
        toast.error(`Push failed: ${data.error}`)
      }
    } catch (err) {
      toast.error('Failed to trigger push')
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto min-h-screen bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Push Subscriptions Debugger</h1>
          <p className="text-slate-500 mt-2">View all devices currently subscribed to background notifications.</p>
        </div>
        <button onClick={fetchSubscriptions} className="bg-white border shadow-sm px-4 py-2 rounded-lg font-bold text-slate-700 hover:bg-slate-50 transition">
          Refresh List
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-12 text-center shadow-sm">
          <ShieldAlert className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">0 Active Subscriptions</h2>
          <p className="text-slate-500 max-w-md mx-auto">
            No devices are currently subscribed to receive push notifications. Go to the Shop or Rider portal and click "Enable Push" to register a device.
          </p>
        </div>
      ) : (
        <div className="grid gap-6">
          {subscriptions.map((sub) => {
            const endpoint = sub.subscription?.endpoint || ''
            const DeviceIcon = getDeviceType(endpoint).icon
            const deviceColor = getDeviceType(endpoint).color
            
            return (
              <div key={sub.id} className="bg-white rounded-2xl border shadow-sm p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className={`p-4 rounded-full bg-slate-50 border ${deviceColor.replace('text-', 'border-').replace('500', '200')}`}>
                  <DeviceIcon className={`w-8 h-8 ${deviceColor}`} />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-slate-900">
                      {sub.profile?.full_name || 'Unknown User'}
                    </h3>
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-bold uppercase tracking-wider">
                      {sub.profile?.role || 'User'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm mb-3">
                    User ID: <span className="font-mono text-xs">{sub.user_id}</span>
                  </p>
                  
                  <div className="bg-slate-50 rounded-lg p-3 border text-xs font-mono text-slate-500 break-all overflow-hidden max-h-20 hover:max-h-full transition-all">
                    <span className="font-bold text-slate-700 block mb-1">Device/Browser Endpoint:</span>
                    {endpoint}
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0 flex flex-col gap-2">
                  <div className="text-xs font-bold text-slate-400 text-right mb-2">
                    Subscribed: {new Date(sub.created_at).toLocaleDateString()}
                  </div>
                  <button 
                    onClick={() => handleTestPush(sub.user_id)}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition shadow-sm"
                  >
                    <Bell size={18} />
                    Send Test Push
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
