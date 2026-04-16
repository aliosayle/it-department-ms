import type { SVGProps } from 'react'

const common: SVGProps<SVGSVGElement> = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export type NavIconId =
  | 'dashboard'
  | 'serviceDesk'
  | 'assets'
  | 'stock'
  | 'storageUnits'
  | 'products'
  | 'purchases'
  | 'delivery'
  | 'suppliers'
  | 'companies'
  | 'sites'
  | 'personnel'
  | 'equipment'
  | 'network'
  | 'users'

export function NavIcon({ id, className }: { id: NavIconId; className?: string }) {
  const c = className ? `${className} nav-icon` : 'nav-icon'
  switch (id) {
    case 'dashboard':
      return (
        <svg {...common} className={c}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      )
    case 'serviceDesk':
      return (
        <svg {...common} className={c}>
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      )
    case 'assets':
      return (
        <svg {...common} className={c}>
          <path d="M4 7V6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2v-1" />
          <path d="M8 12h8M8 8h8M8 16h5" />
        </svg>
      )
    case 'stock':
      return (
        <svg {...common} className={c}>
          <path d="M4 19V5M4 19h16M4 19l4-6 4 3 4-8 4 5" />
        </svg>
      )
    case 'storageUnits':
      return (
        <svg {...common} className={c}>
          <path d="M4 8h16v10H4zM4 8l8-4 8 4" />
          <path d="M9 12v5M15 12v5" />
        </svg>
      )
    case 'products':
      return (
        <svg {...common} className={c}>
          <path d="M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01" />
        </svg>
      )
    case 'purchases':
      return (
        <svg {...common} className={c}>
          <path d="M6 4h12v16H6zM9 8h6M9 12h6M9 16h4" />
        </svg>
      )
    case 'delivery':
      return (
        <svg {...common} className={c}>
          <path d="M5 18H3v-8l2-3h8v11M5 18v-3h12v3M15 18a2 2 0 100-4 2 2 0 000 4zM5 18a2 2 0 100-4 2 2 0 000 4z" />
        </svg>
      )
    case 'suppliers':
      return (
        <svg {...common} className={c}>
          <path d="M16 11V7a4 4 0 00-8 0v4M5 11h14v10H5z" />
        </svg>
      )
    case 'companies':
      return (
        <svg {...common} className={c}>
          <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-4h6v4" />
        </svg>
      )
    case 'sites':
      return (
        <svg {...common} className={c}>
          <path d="M12 3l9 18H3L12 3zM12 9v6" />
        </svg>
      )
    case 'personnel':
      return (
        <svg {...common} className={c}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5 20v-1a7 7 0 0114 0v1" />
        </svg>
      )
    case 'equipment':
      return (
        <svg {...common} className={c}>
          <rect x="2" y="5" width="20" height="14" rx="2" />
          <path d="M6 19h12" />
        </svg>
      )
    case 'network':
      return (
        <svg {...common} className={c}>
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01M12 6v.01M12 18v.01M8.5 8.5l.01.01M15.5 15.5l.01.01M8.5 15.5l.01-.01M15.5 8.5l.01-.01" />
        </svg>
      )
    case 'users':
      return (
        <svg {...common} className={c}>
          <circle cx="9" cy="8" r="2.5" />
          <path d="M4 20v-1a5 5 0 015-5h0a5 5 0 015 5v1" />
          <path d="M17 11h3M18.5 9.5v3" />
        </svg>
      )
  }
}
