'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Phone, Store, Users, MapPin } from 'lucide-react'

export default function Rider2ContactsPage() {
  const [shopOwners, setShopOwners] = useState<any[]>([])
  const [riders, setRiders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchContacts() {
      try {
        const supabase = createClient()
        
        // Fetch all shop owners (joining with shops table to get shop name)
        const { data: shops } = await supabase
          .from('shops')
          .select(`
            name,
            phone,
            address,
            owner:owner_id(full_name, phone)
          `)
        
        if (shops) setShopOwners(shops)

        // Fetch all other riders
        const { data: ridersData } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('role', 'rider')
        
        if (ridersData) setRiders(ridersData)
        
      } catch (err) {
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchContacts()
  }, [])

  if (isLoading) {
    return (
      <div className="px-5 pt-10 text-center text-gray-500 font-bold">
        Loading contacts...
      </div>
    )
  }

  return (
    <div className="px-5 pt-8 pb-32">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
          <Phone size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Directory</h1>
          <p className="text-gray-500 font-medium text-sm">Quick Contacts</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Shop Owners Section */}
        <section>
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Store size={20} className="text-orange-500" />
            Shop Owners
          </h2>
          <div className="space-y-3">
            {shopOwners.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No shops found.</p>
            ) : shopOwners.map((shop, idx) => {
              const phone = shop.phone || shop.owner?.phone
              return (
                <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{shop.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{shop.owner?.full_name || 'Owner'}</p>
                    {shop.address && (
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <MapPin size={10} /> {shop.address}
                      </p>
                    )}
                  </div>
                  {phone && (
                    <a 
                      href={`tel:${phone}`}
                      className="w-10 h-10 bg-green-100 text-green-600 hover:bg-green-600 hover:text-white rounded-full flex items-center justify-center transition active:scale-95"
                    >
                      <Phone size={16} />
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Riders Section */}
        <section>
          <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <Users size={20} className="text-[#2563EB]" />
            Fellow Riders
          </h2>
          <div className="space-y-3">
            {riders.length === 0 ? (
              <p className="text-gray-500 text-sm italic">No riders found.</p>
            ) : riders.map(rider => (
              <div key={rider.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{rider.full_name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Rider Partner</p>
                </div>
                {rider.phone && (
                  <a 
                    href={`tel:${rider.phone}`}
                    className="w-10 h-10 bg-blue-100 text-[#2563EB] hover:bg-blue-600 hover:text-white rounded-full flex items-center justify-center transition active:scale-95"
                  >
                    <Phone size={16} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
