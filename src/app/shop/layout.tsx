import ShopLayoutClient from './ShopLayoutClient'

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <ShopLayoutClient>{children}</ShopLayoutClient>
}
