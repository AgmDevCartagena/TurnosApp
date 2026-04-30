'use client';

import {
  Clock,
  Users,
  FileText,
  ShoppingCart,
} from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard de Compras</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">Vista general del sistema</p>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-gradient-to-br dark:from-slate-800 dark:to-slate-900 p-6 border border-gray-200 dark:border-slate-700 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <Clock className="h-10 w-10 text-yellow-500 dark:text-yellow-400" />
            <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-bold text-yellow-600 dark:text-yellow-400">
              +12%
            </span>
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">24</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Solicitudes Pendientes</p>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-gradient-to-br dark:from-blue-900/50 dark:to-blue-950/50 p-6 border border-gray-200 dark:border-blue-800 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <Users className="h-10 w-10 text-blue-500 dark:text-blue-400" />
            <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400">
              8 HOY
            </span>
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">15</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">En Aprobación</p>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-gradient-to-br dark:from-teal-900/50 dark:to-teal-950/50 p-6 border border-gray-200 dark:border-teal-800 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <FileText className="h-10 w-10 text-teal-500 dark:text-teal-400" />
            <span className="rounded-full bg-teal-500/20 px-3 py-1 text-xs font-bold text-teal-600 dark:text-teal-400">
              ACTIVAS
            </span>
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">9</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Cotizaciones en Proceso</p>
        </div>

        <div className="relative overflow-hidden rounded-xl bg-white dark:bg-gradient-to-br dark:from-emerald-900/50 dark:to-emerald-950/50 p-6 border border-gray-200 dark:border-emerald-800 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <ShoppingCart className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
            <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              MES
            </span>
          </div>
          <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">42</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Órdenes Generadas</p>
        </div>
      </div>

      {/* Gráficos y Estadísticas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Solicitudes por Estado</h3>
          <div className="space-y-3">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Pendientes</span>
                <span className="font-bold text-yellow-600 dark:text-yellow-400">86</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-900">
                <div className="h-full w-[86%] bg-yellow-500"></div>
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">En Aprobación</span>
                <span className="font-bold text-blue-600 dark:text-blue-400">16</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-900">
                <div className="h-full w-[16%] bg-blue-500"></div>
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Aprobadas</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">42</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-900">
                <div className="h-full w-[42%] bg-emerald-500"></div>
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">Rechazadas</span>
                <span className="font-bold text-red-600 dark:text-red-400">0</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-900">
                <div className="h-full w-[0%] bg-red-500"></div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Solicitudes por Área</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Tecnología</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">28</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-cyan-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Operaciones</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">22</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Administración</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">18</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">RRHH</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">12</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-rose-500"></div>
                <span className="text-sm text-gray-700 dark:text-gray-300">Marketing</span>
              </div>
              <span className="font-bold text-gray-900 dark:text-white">6</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Top Proveedores</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">American Lighting</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-900">
                  <div className="h-full w-[85%] bg-cyan-500"></div>
                </div>
                <span className="text-xs font-bold text-cyan-400">$45.2M</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Agm Desarrollos</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-900">
                  <div className="h-full w-[65%] bg-blue-500"></div>
                </div>
                <span className="text-xs font-bold text-blue-400">$32.1M</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">SP Mardique</span>
              <div className="flex items-center gap-2">
                <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-slate-900">
                  <div className="h-full w-[45%] bg-emerald-500"></div>
                </div>
                <span className="text-xs font-bold text-emerald-400">$18.7M</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <button className="rounded-xl bg-yellow-50 dark:bg-gradient-to-br dark:from-yellow-900/30 dark:to-yellow-950/30 border border-yellow-200 dark:border-yellow-800/50 p-6 text-center transition-all hover:border-yellow-400 dark:hover:border-yellow-600 hover:shadow-lg shadow-sm">
          <div className="mb-2 text-5xl font-bold text-yellow-600 dark:text-yellow-400">8</div>
          <div className="text-xs font-medium text-yellow-700 dark:text-yellow-300/80 uppercase tracking-wide">PENDIENTES APROBACIÓN</div>
        </button>

        <button className="rounded-xl bg-blue-50 dark:bg-gradient-to-br dark:from-blue-900/30 dark:to-blue-950/30 border border-blue-200 dark:border-blue-800/50 p-6 text-center transition-all hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg shadow-sm">
          <div className="mb-2 text-5xl font-bold text-blue-600 dark:text-blue-400">5</div>
          <div className="text-xs font-medium text-blue-700 dark:text-blue-300/80 uppercase tracking-wide">EN COTIZACIÓN</div>
        </button>

        <button className="rounded-xl bg-emerald-50 dark:bg-gradient-to-br dark:from-emerald-900/30 dark:to-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 p-6 text-center transition-all hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-lg shadow-sm">
          <div className="mb-2 text-5xl font-bold text-emerald-600 dark:text-emerald-400">12</div>
          <div className="text-xs font-medium text-emerald-700 dark:text-emerald-300/80 uppercase tracking-wide">APROBADAS</div>
        </button>

        <button className="rounded-xl bg-red-50 dark:bg-gradient-to-br dark:from-red-900/30 dark:to-red-950/30 border border-red-200 dark:border-red-800/50 p-6 text-center transition-all hover:border-red-400 dark:hover:border-red-600 hover:shadow-lg shadow-sm">
          <div className="mb-2 text-5xl font-bold text-red-600 dark:text-red-400">2</div>
          <div className="text-xs font-medium text-red-700 dark:text-red-300/80 uppercase tracking-wide">RECHAZADAS</div>
        </button>
      </div>
    </div>
  );
}
