'use client';

import { usePermissions } from '@/hooks/use-permissions';

interface CanProps {
  permission: string | string[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ 
  permission, 
  requireAll = false, 
  children, 
  fallback = null 
}: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isSuperAdmin } = usePermissions();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  const permissions = Array.isArray(permission) ? permission : [permission];
  
  const authorized = requireAll
    ? hasAllPermissions(permissions)
    : hasAnyPermission(permissions);

  return authorized ? <>{children}</> : <>{fallback}</>;
}
