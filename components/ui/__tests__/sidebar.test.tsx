import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sidebar, SidebarToggle } from '@/components/ui/sidebar';

const { signoutMock } = vi.hoisted(() => ({
  signoutMock: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// Mock next/navigation
const mockPathname = vi.fn(() => '/obras');
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

vi.mock('@/lib/actions/perfil', () => ({
  signout: signoutMock,
}));

describe('Sidebar', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders navigation links', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Obras')).toBeTruthy();
    expect(screen.getByText('Perfil')).toBeTruthy();
  });

  it('renders the brand name', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('INTHER')).toBeTruthy();
    expect(screen.getByText('S.R.L.')).toBeTruthy();
  });

  it('has aria-label on nav element', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(nav).toBeTruthy();
  });

  it('sets aria-current="page" on the active link', () => {
    mockPathname.mockReturnValue('/obras');
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    const activeLink = screen.getByText('Obras').closest('a');
    expect(activeLink?.getAttribute('aria-current')).toBe('page');

    const inactiveLink = screen.getByText('Perfil').closest('a');
    expect(inactiveLink?.hasAttribute('aria-current')).toBe(false);
  });

  it('renders Volver and Cerrar sesión buttons', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Volver')).toBeTruthy();
    expect(screen.getByText('Cerrar sesión')).toBeTruthy();
  });

  it('calls server signout action when clicking Cerrar sesión', () => {
    render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText('Cerrar sesión'));

    expect(signoutMock).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<Sidebar isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByLabelText('Cerrar menú');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders overlay when isOpen is true', () => {
    const { container } = render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    const overlay = container.querySelector('.bg-black\\/50');
    expect(overlay).toBeTruthy();
  });

  it('does not render overlay when isOpen is false', () => {
    const { container } = render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    const overlay = container.querySelector('.bg-black\\/50');
    expect(overlay).toBeNull();
  });

  it('applies translate-x-full when closed (mobile hidden)', () => {
    const { container } = render(<Sidebar isOpen={false} onClose={vi.fn()} />);

    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('-translate-x-full');
  });

  it('applies translate-x-0 when open (mobile visible)', () => {
    const { container } = render(<Sidebar isOpen={true} onClose={vi.fn()} />);

    const aside = container.querySelector('aside');
    expect(aside?.className).toContain('translate-x-0');
  });
});

describe('SidebarToggle', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders a button with accessible label', () => {
    render(<SidebarToggle onClick={vi.fn()} />);

    const button = screen.getByLabelText('Abrir menú de navegación');
    expect(button).toBeTruthy();
  });

  it('calls onClick when pressed', () => {
    const onClick = vi.fn();
    render(<SidebarToggle onClick={onClick} />);

    const button = screen.getByLabelText('Abrir menú de navegación');
    fireEvent.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('has focus-visible ring classes', () => {
    render(<SidebarToggle onClick={vi.fn()} />);

    const button = screen.getByLabelText('Abrir menú de navegación');
    expect(button.className).toContain('focus-visible:ring-2');
    expect(button.className).toContain('focus-visible:ring-accent');
    expect(button.className).toContain('focus-visible:outline-none');
  });
});
