'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import {
  LayoutDashboard,
  Users,
  Shield,
  ShoppingCart,
  FileText,
  ClipboardList,
  CheckSquare,
  Package,
  Warehouse,
  FolderOpen,
  BarChart3,
  Bell,
  Truck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    label: 'Usuarios',
    href: '/dashboard/usuarios',
    icon: <Users className="h-5 w-5" />,
    roles: ['super_admin', 'admin'],
  },
  {
    label: 'Roles',
    href: '/dashboard/roles',
    icon: <Shield className="h-5 w-5" />,
    roles: ['super_admin', 'admin'],
  },
  {
    label: 'Proveedores',
    href: '/dashboard/proveedores',
    icon: <Truck className="h-5 w-5" />,
  },
  {
    label: 'Catálogo',
    href: '/dashboard/catalogo',
    icon: <Package className="h-5 w-5" />,
  },
  {
    label: 'Solicitudes',
    href: '/dashboard/solicitudes',
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    label: 'Aprobaciones',
    href: '/dashboard/aprobaciones',
    icon: <CheckSquare className="h-5 w-5" />,
    roles: ['super_admin', 'admin', 'aprobador', 'jefe_compras'],
  },
  {
    label: 'Compras',
    href: '/dashboard/compras',
    icon: <ShoppingCart className="h-5 w-5" />,
    roles: ['super_admin', 'admin', 'comprador', 'jefe_compras'],
  },
  {
    label: 'Inventarios',
    href: '/dashboard/inventarios',
    icon: <Warehouse className="h-5 w-5" />,
  },
  {
    label: 'Documentos',
    href: '/dashboard/documentos',
    icon: <FolderOpen className="h-5 w-5" />,
  },
  {
    label: 'Reportes',
    href: '/dashboard/reportes',
    icon: <BarChart3 className="h-5 w-5" />,
    roles: ['super_admin', 'admin', 'jefe_compras', 'auditor'],
  },
  {
    label: 'Notificaciones',
    href: '/dashboard/notificaciones',
    icon: <Bell className="h-5 w-5" />,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  const filteredItems = navItems.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.rol.nombre);
  });

  return (
    <aside
      className={`flex h-screen flex-col border-r bg-white transition-all duration-300 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      <div className="flex h-16 items-center justify-between border-b px-4">
        {!collapsed && (
          <Link href="/dashboard" className="flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold text-gray-900">MARDIQUE</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
