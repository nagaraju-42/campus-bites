'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // Check if we are already installed
    const isStandAloneMedia = window.matchMedia('(display-mode: standalone)').matches
    if (isStandAloneMedia || (window.navigator as any).standalone) {
      setIsStandalone(true)
      return
    }

    // Check if iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIOSDevice)

    const searchParams = new URLSearchParams(window.location.search)
    const forcePrompt = searchParams.get('install_prompt') === 'true'
    const hasInstalled = localStorage.getItem('pwa_installed_success') === 'true'
    const hasDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true'

    if (hasInstalled) return // Never show if successfully installed via our button

    if (forcePrompt && !isStandalone) {
      setShowPrompt(true)
    } else if (isIOSDevice && !isStandalone && !hasDismissed) {
      setShowPrompt(true)
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      
      const isInstalled = localStorage.getItem('pwa_installed_success') === 'true'
      if (isInstalled) return

      if (forcePrompt) {
        setShowPrompt(true)
      } else {
        const isDismissed = localStorage.getItem('pwa_prompt_dismissed') === 'true'
        if (!isDismissed) {
          setShowPrompt(true)
        }
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [isStandalone])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowPrompt(false)
      localStorage.setItem('pwa_installed_success', 'true')
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  if (isStandalone) return null

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="fixed top-4 left-4 right-4 md:left-auto md:right-4 md:top-4 md:w-96 z-[9999] bg-white rounded-2xl p-5 shadow-2xl border border-[#FEF08A]"
        >
          <button 
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition bg-gray-100 rounded-full p-1"
          >
            <X size={16} />
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-[#FEFCE8] border border-[#EAB308] rounded-xl flex items-center justify-center shrink-0">
              <span className="text-2xl">🍔</span>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Add DineNDeliver to Home</h3>
              <p className="text-sm text-gray-500 font-medium leading-tight">Order food faster and track your deliveries instantly!</p>
            </div>
          </div>
          
          {isIOS ? (
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 font-medium flex flex-col gap-1.5 border border-gray-100">
              <p>To install the app on iOS:</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Tap the <strong>Share</strong> button <span className="inline-block border rounded px-1">⎙</span> below</li>
                <li>Scroll down and tap <strong>Add to Home Screen</strong> <span className="inline-block border rounded px-1">+</span></li>
              </ol>
            </div>
          ) : (
            <button
              onClick={handleInstallClick}
              className="w-full bg-[#EAB308] text-gray-900 font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-md hover:bg-[#CA8A04] transition active:scale-95"
            >
              <Download size={18} />
              Install App
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
