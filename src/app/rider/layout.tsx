import { Metadata } from 'next'
import RiderLayoutClient from './RiderLayoutClient'

export const metadata: Metadata = {
  manifest: '/rider/manifest.webmanifest'
}

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return <RiderLayoutClient>{children}</RiderLayoutClient>
}
