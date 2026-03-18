import Link from 'next/link';
import type { AuthUser } from '@/contexts/AuthContext';

interface NavbarProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-lg font-bold text-slate-900">
            IDEA Platform
          </Link>
          <nav className="hidden items-center gap-5 text-sm text-slate-600 sm:flex">
            <Link href="/dashboard" className="hover:text-slate-900">
              Dashboard
            </Link>
            <Link href="/builder/new" className="hover:text-slate-900">
              New Project
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900">{user.name || 'Builder'}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>
          <button
            onClick={onLogout}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
