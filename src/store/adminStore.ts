import { create } from 'zustand'

interface AdminState {
  pendingShopApprovals: number
  unresolvedReports: number
  setPendingApprovals: (count: number) => void
  setUnresolvedReports: (count: number) => void
}

export const useAdminStore = create<AdminState>((set) => ({
  pendingShopApprovals: 0,
  unresolvedReports: 0,
  setPendingApprovals: (count) => set({ pendingShopApprovals: count }),
  setUnresolvedReports: (count) => set({ unresolvedReports: count }),
}))
