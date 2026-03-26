'use client';

import { useAuthStore } from '@/lib/auth-store';
import {
  Users,
  ShoppingCart,
  ClipboardList,
  CheckSquare,
  TrendingUp,
  Package,
} from 'lucide-react';

const stats = [
  { label: 'Solicitudes Pendientes', value: '—', icon: ClipboardList, color: 'bg-blue-500' },
  { label: 'Aprobaciones Pendientes', value: '—', icon: CheckSquare, color: 'bg-amber-500' },
  { label: 'Órdenes Activas', value: '—', icon: ShoppingCart, color: 'bg-green-500' },
  { label: 'Proveedores Activos', value: '—', icon: TrendingUp, color: 'bg-purple-500' },
  { label: 'Usuarios del Sistema', value: '—', icon: Users, color: 'bg-indigo-500' },
  { label: 'Items en Catálogo', value: '—', icon: Package, color: 'bg-rose-500' },
];

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {user?.nombre}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Resumen general del sistema de gestión de compras
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm"
          >
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color} text-white`}>
              <stat.icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Actividad Reciente</h3>
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            Los datos se mostrarán cuando el sistema esté conectado a la base de datos
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">Solicitudes por Estado</h3>
          <div className="flex h-48 items-center justify-center text-sm text-gray-400">
            Los gráficos se mostrarán cuando haya datos disponibles
          </div>
        </div>
      </div>
    </div>
  );
}
