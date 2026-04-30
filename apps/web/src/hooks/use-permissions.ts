import { useAuthStore } from '@/lib/auth-store';

export function usePermissions() {
  const { permissions, isSuperAdmin, hasPermission, hasAnyPermission, hasAllPermissions } = useAuthStore();

  return {
    permissions: permissions || [],
    isSuperAdmin: isSuperAdmin || false,
    hasPermission: (permission: string) => {
      if (isSuperAdmin) return true;
      return hasPermission ? hasPermission(permission) : false;
    },
    hasAnyPermission: (perms: string[]) => {
      if (isSuperAdmin) return true;
      return hasAnyPermission ? hasAnyPermission(perms) : false;
    },
    hasAllPermissions: (perms: string[]) => {
      if (isSuperAdmin) return true;
      return hasAllPermissions ? hasAllPermissions(perms) : false;
    },
    canView: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission ? hasPermission(`${module}.view`) : false;
    },
    canCreate: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission ? hasPermission(`${module}.create`) : false;
    },
    canUpdate: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission ? hasPermission(`${module}.update`) : false;
    },
    canDelete: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission ? hasPermission(`${module}.delete`) : false;
    },
    canApprove: (module: string) => {
      if (isSuperAdmin) return true;
      return hasPermission ? hasPermission(`${module}.approve`) : false;
    },
  };
}
