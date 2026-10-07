import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useStore } from '@lib/store'

const NAV = [
  { href: '/', label: 'Översikt', icon: '◧' },
  { href: '/medlemmar', label: 'Medlemmar', icon: '◉' },
  { href: '/schema', label: 'Schema & bokning', icon: '▦' },
  { href: '/incheckning', label: 'Incheckning', icon: '✓' },
  { href: '/lag', label: 'Lag & närvaro', icon: '⚑' },
  { href: '/ekonomi', label: 'Ekonomi', icon: '¤' },
  { href: '/installningar', label: 'Inställningar', icon: '⚙' },
]

export default function Layout({ title, actions, children }) {
  const router = useRouter()
  const { state, toast } = useStore()

  return (
    <div className="shell">
      <Head>
        <title>{`${title} · Arena`}</title>
      </Head>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>
          <div>
            <strong>Arena</strong>
            <small>{state ? state.org.name : 'Idrott & gym'}</small>
          </div>
        </div>
        <nav>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              <a className={router.pathname === n.href ? 'active' : ''}>
                <span aria-hidden="true">{n.icon}</span>
                {n.label}
              </a>
            </Link>
          ))}
        </nav>
      </aside>
      <main className="content">
        <header className="page-header">
          <h1>{title}</h1>
          {actions && <div className="actions">{actions}</div>}
        </header>
        {state ? children : <p className="muted">Laddar…</p>}
      </main>
      {toast && (
        <div className={`toast ${toast.type}`} role="status">
          {toast.text}
        </div>
      )}
    </div>
  )
}
