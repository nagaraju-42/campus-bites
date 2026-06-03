import { Metadata } from 'next'
import ShopLayoutClient from './ShopLayoutClient'

export const metadata: Metadata = {
  manifest: '/shop/manifest.webmanifest'
}

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopLayoutClient>{children}</ShopLayoutClient>
}
