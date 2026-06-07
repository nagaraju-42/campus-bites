// ============================================================
// DATABASE TYPES
// ============================================================

export type UserRole = 'student' | 'shop_owner' | 'rider' | 'kitchen' | 'admin'

export type OrderStatus =
  | 'pending'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled'

export type PaymentMethod = 'UPI' | 'cash_on_delivery'

export type ShopStatus = 'pending' | 'approved' | 'suspended'

// ============================================================
// PROFILE TYPES
// ============================================================

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string | null
  email: string
  avatar_url: string | null
  college_name: string | null
  hostel_name: string | null
  room_number: string | null
  created_at: string
}

export interface StudentProfile {
  id: string
  college_name: string
  hostel_name: string
  room_number: string
  block?: string
  floor?: string
}

export interface FullStudentProfile extends Profile {
  student_profiles: StudentProfile
}

// ============================================================
// SHOP TYPES
// ============================================================

export interface Shop {
  id: string
  owner_id: string
  name: string
  description: string | null
  address: string
  phone: string | null
  cover_image?: string
  upi_id: string | null
  logo_url: string | null
  is_open: boolean
  status: ShopStatus
  opening_time: string | null
  closing_time: string | null
  dine_in_enabled?: boolean | null
  min_order_amount?: number
  created_at: string
  // Joined fields
  categories?: string[]
  rating?: number
  total_orders?: number
  estimated_time?: string
}

// ============================================================
// MENU TYPES
// ============================================================

export interface MenuItem {
  id: string
  shop_id: string
  name: string
  description: string | null
  category: string
  price: number
  image_url: string | null
  is_available: boolean
  is_veg?: boolean
  is_featured?: boolean
  is_archived?: boolean
  category_id?: string | null
  variants?: { name: string, price: number, is_available?: boolean }[] | null
  created_at: string
}

export interface MenuCategory {
  name: string
  items: MenuItem[]
}

// ============================================================
// ORDER TYPES
// ============================================================

export interface Order {
  id: string
  order_number: string
  student_id: string
  shop_id: string
  rider_id: string | null
  order_type: 'delivery' | 'dine_in'
  status: OrderStatus
  total_amount: number
  delivery_fee: number
  platform_fee: number
  payment_method: PaymentMethod
  hostel_name: string
  room_number: string
  block: string | null
  floor: string | null
  delivery_otp: string
  special_note: string | null
  cancellation_reason?: string | null
  placed_at: string
  delivered_at: string | null
  // Joined
  shops?: Pick<Shop, 'id' | 'name' | 'logo_url' | 'phone' | 'description' | 'address'>
  order_items?: OrderItem[]
  rider?: Pick<Profile, 'full_name' | 'phone'>
  student?: Pick<Profile, 'full_name' | 'phone'>
}

export interface OrderItem {
  id: string
  order_id: string
  menu_item_id: string
  item_name: string
  quantity: number
  unit_price: number
  partner_shop_id?: string | null
  partner?: {
    name: string
  } | null
}

// ============================================================
// FORM TYPES
// ============================================================

export interface RegisterFormData {
  full_name: string
  email: string
  phone: string
  password: string
  confirm_password: string
  college_name: string
  hostel_name: string
  room_number: string
}

export interface LoginFormData {
  email: string
  password: string
}

export interface CheckoutFormData {
  hostel_name: string
  room_number: string
  special_note: string
  payment_method: PaymentMethod
}

// ============================================================
// DASHBOARD TYPES
// ============================================================

export interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  newCustomers: number
  cancelledOrders: number
}

export interface ChartDataPoint {
  time: string
  revenue: number
  orders: number
}

export interface RiderEarnings {
  date: string
  deliveriesCompleted: number
  totalEarned: number
}

export interface PlatformMetrics {
  totalRevenue: number
  platformFeesEarned: number
  activeShops: number
  totalDeliveriesToday: number
  chartData: { day: string; revenue: number }[]
}

export interface Promotion {
  id: string
  code: string
  discount_percent: number
  is_active: boolean
  banner_text: string
  created_at?: string
}
