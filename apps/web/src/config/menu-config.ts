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
  BarChart3,
  Truck,
  Settings,
  Sliders,
  Building2,
  Key,
  TrendingUp,
} from 'lucide-react';

export interface MenuItem {
  label: string;
  href: string;
  icon: any;
  permission: string;
  children?: MenuItem[];
}

export interface MenuSection {
  title: string;
  items: MenuItem[];
}

export const menuConfig: MenuSection[] = [
  {
    title: 'PRINCIPAL',
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        permission: 'dashboard.view',
      },
      {
        label: 'Catálogo',
        href: '/dashboard/catalogo',
        icon: Package,
        permission: 'catalog.view',
      },
      {
        label: 'Solicitudes',
        href: '/dashboard/solicitudes',
        icon: ClipboardList,
        permission: 'requests.view',
      },
      {
        label: 'Aprobaciones',
        href: '/dashboard/aprobaciones',
        icon: CheckSquare,
        permission: 'approvals.view',
      },
      {
        label: 'Cotizaciones',
        href: '/dashboard/cotizaciones',
        icon: FileText,
        permission: 'quotations.view',
      },
      {
        label: 'Órdenes de Compra',
        href: '/dashboard/compras',
        icon: ShoppingCart,
        permission: 'purchase_orders.view',
      },
      {
        label: 'Recepción',
        href: '/dashboard/recepcion',
        icon: Warehouse,
        permission: 'reception.view',
      },
      {
        label: 'Seguimiento',
        href: '/dashboard/seguimiento',
        icon: TrendingUp,
        permission: 'tracking.view',
      },
      {
        label: 'Proveedores',
        href: '/dashboard/proveedores',
        icon: Truck,
        permission: 'suppliers.view',
      },
    ],
  },
  {
    title: 'CONFIG',
    items: [
      {
        label: 'Parametrización',
        href: '/dashboard/parametrizacion',
        icon: Settings,
        permission: 'settings.view',
      },
      {
        label: 'Atributos',
        href: '/dashboard/atributos',
        icon: Sliders,
        permission: 'attributes.view',
      },
    ],
  },
  {
    title: 'SEGURIDAD',
    items: [
      {
        label: 'Usuarios',
        href: '/dashboard/usuarios',
        icon: Users,
        permission: 'users.view',
      },
      {
        label: 'Roles',
        href: '/dashboard/roles',
        icon: Shield,
        permission: 'roles.view',
      },
      {
        label: 'Permisos',
        href: '/dashboard/permisos',
        icon: Key,
        permission: 'permissions.view',
      },
      {
        label: 'Empresas',
        href: '/dashboard/empresas',
        icon: Building2,
        permission: 'companies.view',
      },
    ],
  },
];
