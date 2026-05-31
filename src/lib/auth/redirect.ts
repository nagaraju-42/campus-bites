import { UserRole } from '@/types'

export function getRoleRedirect(role: UserRole | string): string {
  switch (role) {
    case 'student': return '/student/home'
    case 'shop_owner': return '/shop/dashboard'
    case 'kitchen': return '/shop/dashboard'
    case 'rider': return '/rider/pool'
    case 'admin': return '/admin/dashboard'
    default: return '/login'
  }
}
