import { ReactNode } from 'react'

interface AdminMetricCardProps {
  title: string
  value: string | number
  icon: ReactNode
  trend?: string
  trendUp?: boolean
}

export default function AdminMetricCard({ title, value, icon, trend, trendUp }: AdminMetricCardProps) {
  return (
    <div className="bg-[#1E293B] rounded-2xl p-5 border border-slate-700/50 flex items-start justify-between shadow-lg">
      <div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</p>
        <h3 className="text-3xl font-display font-bold text-white">{value}</h3>
        {trend && (
          <p className={`text-xs font-bold mt-3 flex items-center gap-1 ${trendUp ? 'text-emerald-400' : 'text-rose-400'}`}>
            {trendUp ? '↑' : '↓'} {trend} vs last week
          </p>
        )}
      </div>
      <div className="p-3 bg-slate-800 text-slate-300 rounded-xl border border-slate-700">
        {icon}
      </div>
    </div>
  )
}
