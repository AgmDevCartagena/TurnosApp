import { useAuthStore } from '@/lib/auth-store';

export function usePermissions() {
  const { user, hasPermission } = useAuthStore();
  const permissions = user?.permisos ?? [];
  const isSuperAdmin = user?.rol.nombre === 'super_admin';
  const hasAnyPermission = (perms: string[]) => perms.some(permission => hasPermission(permission));
  const hasAllPermissions = (perms: string[]) => perms.every(permission => hasPermission(permission));

  return {
    permissions,
    isSuperAdmin,
    hasPermission: (permission: string) => {
      if (isSuperAdmin) return true;
      return hasPermission(permission);
    },
    hasAnyPermission: (perms: string[]) => {
      if (isSuperAdmin) return true;
      return hasAnyPermission(perms);
    },
    hasAllPermissions: (perms: string[]) => {
      if (isSuperAdmin) return true;
      return hasAllPermissions(perms);
    },
    canView: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission(`${module}.view`);
    },
    canCreate: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission(`${module}.create`);
    },
    canUpdate: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission(`${module}.update`);
    },
    canDelete: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission(`${module}.delete`);
    },
    canApprove: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission(`${module}.approve`);
    },
  };
}
