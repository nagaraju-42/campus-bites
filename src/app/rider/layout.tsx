import RiderLayoutClient from './RiderLayoutClient'

export default function RiderLayout({ children }: { children: React.ReactNode }) {
  return <RiderLayoutClient>{children}</RiderLayoutClient>
}
