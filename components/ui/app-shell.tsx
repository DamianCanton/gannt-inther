'use client';

import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Sidebar, SidebarToggle } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // No mostramos el AppShell en páginas de login o impresión
  if (pathname?.startsWith('/auth') || pathname?.endsWith('/print')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background text-text">
      <SidebarToggle onClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <main className="flex-1 p-8 pt-16 md:pt-8 md:ml-64 overflow-y-auto">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
