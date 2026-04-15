'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, HardHat, User, LogOut, ArrowLeft, Menu, X } from 'lucide-react';
import { useState, useCallback, useEffect, useRef } from 'react';

const links = [
  { href: '/obras', label: 'Obras', icon: Home },
  { href: '/admin/templates', label: 'Tipos de Obra', icon: HardHat },
  { href: '/perfil', label: 'Perfil', icon: User },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  // Close drawer on route change (mobile) — skip initial mount
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      onClose();
    }
  }, [pathname, onClose]);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary text-white flex flex-col shadow-xl transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Panel de navegación"
      >
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              INTHER<span className="text-accent">S.R.L.</span>
            </h1>
            <p className="text-xs text-white/70 uppercase tracking-wider mt-1">Gestión de Obras</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-md text-white/80 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
            aria-label="Cerrar menú"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto" aria-label="Navegación principal">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname?.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href as any}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none ${
                  isActive
                    ? 'bg-accent text-white font-medium shadow-sm'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={20} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-2">
          <button
            onClick={() => window.history.back()}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-white/80 hover:bg-white/10 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <ArrowLeft size={20} />
            Volver
          </button>

          <button
            onClick={() => (window.location.href = '/auth/login')}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-md text-white/80 hover:bg-red-500/20 hover:text-red-300 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <LogOut size={20} />
            Cerrar sesión
          </button>
        </div>
      </aside>
    </>
  );
}

/** Hamburger button for mobile viewports */
export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-primary text-white shadow-lg focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
      aria-label="Abrir menú de navegación"
    >
      <Menu size={24} />
    </button>
  );
}
