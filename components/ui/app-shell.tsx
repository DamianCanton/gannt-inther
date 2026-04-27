'use client';

import { usePathname } from 'next/navigation';
import { useState, useCallback } from 'react';
import { Sidebar, SidebarToggle } from './sidebar';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isGanttWorkspace = pathname?.startsWith('/obra/') || pathname?.startsWith('/preview/obra/')

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // No mostramos el AppShell en páginas de login o impresión
  if (pathname?.startsWith('/auth') || pathname?.endsWith('/print')) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-background text-text">
      <SidebarToggle onClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      <main className={`flex-1 overflow-y-auto pt-16 md:ml-64 md:pt-6 ${isGanttWorkspace ? 'p-4 md:p-6' : 'p-8'}`}>
        <div className={isGanttWorkspace ? 'mx-auto max-w-[1400px]' : 'mx-auto max-w-6xl'}>{children}</div>
      </main>
    </div>
  );
}
