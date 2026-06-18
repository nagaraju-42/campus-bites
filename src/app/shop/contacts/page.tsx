'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Phone } from 'lucide-react'

export default function ShopContactsPage() {
  const [ridersList, setRidersList] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchRiders() {
      try {
        const supabase = createClient()
        const { data: riders } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('role', 'rider')
        
        if (riders) setRidersList(riders)
      } catch (err) {
        console.error("Failed to fetch riders:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchRiders()
  }, [])

  return (
    <div className="p-4 md:p-8 space-y-6 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">Rider Directory</h1>
        <p className="text-gray-500 font-medium text-sm mt-1">Contact registered delivery partners directly.</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users size={20} className="text-[#2563EB]" />
          Available Riders
        </h2>
        
        {isLoading ? (
          <p className="text-gray-400 text-sm py-4">Loading directory...</p>
        ) : ridersList.length === 0 ? (
          <p className="text-gray-400 text-sm py-4">No riders found.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {ridersList.map(rider => (
              <div key={rider.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-100 rounded-xl">
                <div>
                  <p className="font-bold text-sm text-gray-900">{rider.full_name}</p>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">{rider.phone || 'No phone'}</p>
                </div>
                {rider.phone && (
                  <a 
                    href={`tel:${rider.phone}`}
                    className="w-10 h-10 bg-blue-100 text-[#2563EB] hover:bg-blue-600 hover:text-white rounded-full flex items-center justify-center transition active:scale-95"
                    title={`Call ${rider.full_name}`}
                  >
                    <Phone size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
