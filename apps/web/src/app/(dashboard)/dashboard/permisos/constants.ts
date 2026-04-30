// Catálogo de módulos del sistema
export const MODULOS = {
  dashboard: 'Dashboard',
  requests: 'Solicitudes',
  approvals: 'Aprobaciones',
  quotes: 'Cotizaciones',
  orders: 'Órdenes de Compra',
  users: 'Usuarios',
  roles: 'Roles',
  permissions: 'Permisos',
  companies: 'Empresas',
  areas: 'Áreas',
  cost_centers: 'Centros de Costo',
  suppliers: 'Proveedores',
  catalog: 'Catálogo',
  inventory: 'Inventario',
  reports: 'Reportes',
  settings: 'Configuración',
} as const;

// Catálogo de acciones estándar
export const ACCIONES = {
  view: 'Ver/Consultar',
  create: 'Crear',
  update: 'Editar/Actualizar',
  delete: 'Eliminar',
  approve: 'Aprobar',
  reject: 'Rechazar',
  export: 'Exportar',
  import: 'Importar',
  manage: 'Gestionar',
  assign: 'Asignar',
  configure: 'Configurar',
} as const;

// Colores para badges de módulos
export const MODULO_COLORS: Record<string, string> = {
  dashboard: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  requests: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  approvals: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  quotes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  orders: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  users: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  roles: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  permissions: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400',
  companies: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
  areas: 'bg-lime-100 text-lime-800 dark:bg-lime-900/30 dark:text-lime-400',
  cost_centers: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  suppliers: 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400',
  catalog: 'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/30 dark:text-fuchsia-400',
  inventory: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400',
  reports: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  settings: 'bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400',
};

export type ModuloKey = keyof typeof MODULOS;
export type AccionKey = keyof typeof ACCIONES;
