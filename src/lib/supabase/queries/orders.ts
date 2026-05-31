import { createClient } from '@/lib/supabase/client'
import { Order, OrderItem, PaymentMethod } from '@/types'
import { CartItem } from '@/store/cartStore'

export async function getStudentOrders(studentId: string): Promise<Order[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      shops ( id, name, logo_url, phone ),
      order_items (*)
    `)
    .eq('student_id', studentId)
    .order('placed_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      shops ( id, name, logo_url, phone ),
      order_items (*),
      rider:profiles!orders_rider_id_fkey(full_name, phone)
    `)
    .eq('id', orderId)
    .single()

  if (error) return null
  return data
}

export async function placeOrder(params: {
  studentId: string
  shopId: string
  cartItems: CartItem[]
  totalAmount: number
  deliveryFee: number
  platformFee: number
  paymentMethod: PaymentMethod
  hostelName: string
  roomNumber: string
  specialNote: string
}): Promise<{ orderId: string; orderNumber: string }> {
  const supabase = createClient()

  // Generate order number like #CB123456
  const orderNumber = `#CB${Date.now().toString().slice(-6)}`
  // Generate random 4-digit OTP
  const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString()

  // 1. Insert the order
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      order_number: orderNumber,
      student_id: params.studentId,
      shop_id: params.shopId,
      status: 'pending',
      total_amount: params.totalAmount,
      delivery_fee: params.deliveryFee,
      platform_fee: params.platformFee,
      payment_method: params.paymentMethod,
      hostel_name: params.hostelName,
      room_number: params.roomNumber,
      special_note: params.specialNote || null,
      delivery_otp: deliveryOtp,
    })
    .select()
    .single()

  if (orderError) throw new Error(orderError.message)

  // 2. Insert all order items
  const orderItemsPayload = params.cartItems.map((item) => ({
    order_id: order.id,
    menu_item_id: item.id,
    item_name: item.name,
    quantity: item.quantity,
    unit_price: item.price,
  }))

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsPayload)

  if (itemsError) throw new Error(itemsError.message)

  return { orderId: order.id, orderNumber }
}
