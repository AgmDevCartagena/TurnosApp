'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usePermissions } from '@/hooks/use-permissions';
import { AlertCircle } from 'lucide-react';

interface PermissionGuardProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function PermissionGuard({
  permission,
  children,
  fallback,
  redirectTo = '/dashboard',
}: PermissionGuardProps) {
  const router = useRouter();
  const { hasPermission, isSuperAdmin } = usePermissions();

  const authorized = isSuperAdmin || hasPermission(permission);

  useEffect(() => {
    if (!authorized && redirectTo) {
      router.push(redirectTo);
    }
  }, [authorized, redirectTo, router]);

  if (!authorized) {
    if (fallback) return <>{fallback}</>;

    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Acceso Denegado
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            No tienes permisos para acceder a esta sección.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
