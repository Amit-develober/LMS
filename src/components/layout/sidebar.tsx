'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/toast';
import {
  LayoutDashboard,
  BookOpen,
  ScanLine,
  BookPlus,
  BookCheck,
  Users,
  ClipboardList,
  Settings,
  LogOut,
  Menu,
  X,
  Library,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/books', label: 'Books', icon: BookOpen },
  { href: '/scan', label: 'Scan QR', icon: ScanLine },
  { href: '/issue', label: 'Issue Book', icon: BookPlus },
  { href: '/return', label: 'Return Book', icon: BookCheck },
  { href: '/students', label: 'Students', icon: Users },
  { href: '/history', label: 'Issue History', icon: ClipboardList },
  { href: '/settings', label: 'Settings', icon: Settings },
];

import { auth } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';

export default function Sidebar({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      document.cookie = 'firebase_auth_token=; path=/; max-age=0';
      showToast('Logged out successfully', 'info');
      router.push('/login');
    } catch {
      showToast('Logout failed', 'error');
    }
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-[260px] flex flex-col
          transition-transform duration-300 ease-in-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{ backgroundColor: 'var(--sidebar-bg)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' }}
          >
            <Library className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">QR Library</h1>
            <p className="text-xs" style={{ color: 'var(--sidebar-text)' }}>
              Management System
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden ml-auto text-white/60 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 overflow-y-auto">
          <div className="space-y-1">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-200 group relative
                    ${
                      active
                        ? 'text-white'
                        : 'hover:bg-white/5'
                    }
                  `}
                  style={{
                    color: active ? 'var(--sidebar-text-active)' : 'var(--sidebar-text)',
                    backgroundColor: active ? 'var(--sidebar-active)' : undefined,
                  }}
                >
                  {active && (
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
                      style={{ backgroundColor: '#3b82f6' }}
                    />
                  )}
                  <item.icon className={`w-5 h-5 shrink-0 ${active ? 'text-blue-400' : ''}`} />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="w-4 h-4 opacity-50" />}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-200 hover:bg-white/5"
            style={{ color: 'var(--sidebar-text)' }}
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top bar (mobile) */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-blue-600" />
            <span className="font-semibold text-sm">QR Library</span>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-[1400px] mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
