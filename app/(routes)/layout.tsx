import { AppShell } from '@/components/ui/app-shell';

export default function RoutesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <AppShell>{children}</AppShell>;
}
