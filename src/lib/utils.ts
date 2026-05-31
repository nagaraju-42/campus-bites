import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { OrderStatus } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toFixed(0)}`
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getOrderStatusLabel(status: OrderStatus): string {
  const labels: Record<OrderStatus, string> = {
    pending: 'Order Placed',
    preparing: 'Preparing',
    ready: 'Ready',
    assigned: 'Rider Assigned',
    out_for_delivery: 'Out for Delivery',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
  }
  return labels[status]
}

export function getOrderStatusColor(status: OrderStatus): string {
  const colors: Record<OrderStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-blue-100 text-blue-700',
    assigned: 'bg-purple-100 text-purple-700',
    out_for_delivery: 'bg-indigo-100 text-indigo-700',
    delivered: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }
  return colors[status]
}

export function getOrderStatusStep(status: OrderStatus): number {
  const steps: Record<OrderStatus, number> = {
    pending: 1,
    preparing: 2,
    ready: 3,
    assigned: 3,
    out_for_delivery: 4,
    delivered: 5,
    cancelled: 0,
  }
  return steps[status]
}
