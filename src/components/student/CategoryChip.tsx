export default function CategoryChip({
  label, isActive, onClick
}: { label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all duration-200 flex-shrink-0 border-2 ${
        isActive
          ? 'bg-gray-900 text-white border-gray-900 shadow-md'
          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
      }`}
    >
      {label}
    </button>
  )
}
