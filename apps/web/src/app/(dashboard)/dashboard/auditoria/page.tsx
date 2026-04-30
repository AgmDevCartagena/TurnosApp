'use client';

import { FileSearch, Download, Filter } from 'lucide-react';

export default function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Auditoría</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Registro de actividades y cambios del sistema</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-lg border border-gray-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800">
            <Filter className="h-4 w-4" />
            Filtrar
          </button>
          <button className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-primary/90">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-12 text-center shadow-sm">
        <FileSearch className="mx-auto h-16 w-16 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Módulo de Auditoría
        </h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Consulta el registro completo de todas las acciones realizadas en el sistema para trazabilidad y cumplimiento.
        </p>
      </div>
    </div>
  );
}
