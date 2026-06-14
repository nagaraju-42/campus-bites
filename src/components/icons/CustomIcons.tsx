import React from 'react'

/** Orange plate/dome logo icon – matches the DineNDeliver header logo */
export const LogoIcon = ({ className = '' }: { className?: string }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Plate base */}
    <ellipse cx="16" cy="22" rx="13" ry="3" fill="#EA580C" opacity="0.18"/>
    {/* Cloche/dome */}
    <path d="M4 19C4 12.373 9.373 7 16 7C22.627 7 28 12.373 28 19H4Z" fill="#EA580C"/>
    {/* Shine on dome */}
    <path d="M9 13C10.5 10.5 13 9 16 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    {/* Plate rim */}
    <rect x="3" y="19" width="26" height="2.5" rx="1.25" fill="#C2410C"/>
    {/* Handle on top */}
    <rect x="14" y="4" width="4" height="3.5" rx="2" fill="#EA580C"/>
    {/* Steam lines */}
    <path d="M11 4.5C11 3.5 12 3 12 2" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
    <path d="M16 3.5C16 2.5 17 2 17 1" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
    <path d="M21 4.5C21 3.5 20 3 20 2" stroke="#EA580C" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
  </svg>
)

/** Orange verified badge – orange circle with white checkmark */
export const VerifiedBadgeIcon = ({ className = '' }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="9" cy="9" r="9" fill="#EA580C"/>
    <path d="M5.5 9L7.8 11.5L12.5 6.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

/** Heart outline – gray */
export const HeartOutlineIcon = ({ className = '' }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

/** Heart filled – red/orange */
export const HeartFilledIcon = ({ className = '' }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="#EA580C" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>
)

/** Clock icon – orange stroke */
export const ClockIcon = ({ className = '' }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10"/>
    <polyline points="12 6 12 12 16 14"/>
  </svg>
)

/** Scooter/bike delivery icon – orange stroke */
export const ScooterIcon = ({ className = '' }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="5.5" cy="17.5" r="2.5"/>
    <circle cx="18.5" cy="17.5" r="2.5"/>
    <path d="M8 17.5h6"/>
    <path d="M15 6l1 4H9l-1 3"/>
    <path d="M9 10H6a2 2 0 0 0-2 2v3h1"/>
    <path d="M15 6h3l1 4"/>
  </svg>
)

/** Wallet/bag icon – green stroke for min order */
export const WalletIcon = ({ className = '' }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
)

/** Hamburger / 3-line menu icon */
export const HamburgerIcon = ({ className = '' }: { className?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <line x1="3" y1="6" x2="21" y2="6"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <line x1="3" y1="18" x2="21" y2="18"/>
  </svg>
)

/** Bell notification icon */
export const BellIcon = ({ className = '' }: { className?: string }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1F2937" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
)

/** Chevron / dropdown arrow */
export const ChevronDownIcon = ({ className = '' }: { className?: string }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
)

/** GPS / target icon */
export const GPSIcon = ({ className = '' }: { className?: string }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10"/>
    <circle cx="12" cy="12" r="3"/>
    <line x1="12" y1="2" x2="12" y2="5"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
    <line x1="2" y1="12" x2="5" y2="12"/>
    <line x1="19" y1="12" x2="22" y2="12"/>
  </svg>
)

/** Map pin icon – orange fill */
export const MapPinIcon = ({ className = '' }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#EA580C"/>
    <circle cx="12" cy="9" r="2.5" fill="white"/>
  </svg>
)

/** Filter / sliders icon */
export const FilterIcon = ({ className = '' }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="8" y1="12" x2="20" y2="12"/>
    <line x1="12" y1="18" x2="20" y2="18"/>
    <circle cx="4" cy="6" r="2" fill="#EA580C" stroke="none"/>
    <circle cx="8" cy="12" r="2" fill="#EA580C" stroke="none"/>
    <circle cx="12" cy="18" r="2" fill="#EA580C" stroke="none"/>
  </svg>
)

/** Search icon */
export const SearchIcon = ({ className = '' }: { className?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
)

/* ─── Bottom Nav Icons ─── */

export const NavHomeIcon = ({ className = '', active = false }: { className?: string; active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9.5L12 3L21 9.5V20C21 20.55 20.55 21 20 21H15V16H9V21H4C3.45 21 3 20.55 3 20V9.5Z"
      fill={active ? '#EA580C' : 'none'}
      stroke={active ? '#EA580C' : '#9CA3AF'}
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

export const NavSearchIcon = ({ className = '', active = false }: { className?: string; active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="11" cy="11" r="7" stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2"/>
    <path d="M16.5 16.5L21 21" stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2.2" strokeLinecap="round"/>
  </svg>
)

export const NavOrdersIcon = ({ className = '', active = false }: { className?: string; active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z"
      stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      fill={active ? '#FFF5F1' : 'none'}/>
    <line x1="3" y1="6" x2="21" y2="6" stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2"/>
    <path d="M16 10a4 4 0 0 1-8 0" stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const NavCartIcon = ({ className = '', active = false }: { className?: string; active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4H6Z"
      stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      fill={active ? '#FFF5F1' : 'none'}/>
    <line x1="3" y1="6" x2="21" y2="6" stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2"/>
    <path d="M16 10a4 4 0 0 1-8 0" stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)

export const NavOffersIcon = ({ className = '', active = false }: { className?: string; active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l9 9a2 2 0 0 0 2.828 0l7.172-7.172a2 2 0 0 0 0-2.828L12.586 2.586Z"
      stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      fill={active ? '#FFF5F1' : 'none'}/>
    <circle cx="7.5" cy="7.5" r="1.5" fill={active ? '#EA580C' : '#9CA3AF'}/>
    <line x1="9" y1="15" x2="15" y2="9" stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

export const NavProfileIcon = ({ className = '', active = false }: { className?: string; active?: boolean }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="8" r="4" stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2" fill={active ? '#FFF5F1' : 'none'}/>
    <path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke={active ? '#EA580C' : '#9CA3AF'} strokeWidth="2" strokeLinecap="round"/>
  </svg>
)
