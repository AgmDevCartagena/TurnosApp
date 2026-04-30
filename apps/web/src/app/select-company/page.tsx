'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import { useCompanyStore } from '@/lib/company-store';
import { useAuthStore } from '@/lib/auth-store';

export default function SelectCompanyPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { companies, selectCompany, fetchUserContext, isLoading } = useCompanyStore();
  const [error, setError] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    fetchUserContext().catch((err) => {
      console.error('Error al cargar contexto:', err);
      setError('Error al cargar las empresas disponibles');
    });
  }, [isAuthenticated, fetchUserContext, router]);

  const handleSelectCompany = async (companyId: string) => {
    setError(null);
    setSelectedCompanyId(companyId);

    try {
      await selectCompany(companyId);
      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        'Error al seleccionar la empresa';
      setError(message);
      setSelectedCompanyId(null);
    }
  };

  if (isLoading && companies.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
          <p className="mt-4 text-sm text-slate-600">Cargando empresas...</p>
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-9 w-9 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Sin Empresas Asignadas
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              No tienes acceso a ninguna empresa. Contacta al administrador del sistema.
            </p>
          </div>
          <button
            onClick={() => {
              useAuthStore.getState().logout();
              router.push('/login');
            }}
            className="w-full rounded-lg bg-slate-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Volver al Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600">
              <Building2 className="h-9 w-9 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Selecciona tu Empresa
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Hola <span className="font-semibold">{user?.nombre}</span>, selecciona la empresa con la que deseas operar
            </p>
          </div>

          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSelectCompany(company.id)}
                disabled={selectedCompanyId !== null}
                className="group relative w-full rounded-lg border border-slate-200 bg-white p-4 text-left transition-all hover:border-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 group-hover:text-blue-600">
                      {company.nombre}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      NIT: {company.nit}
                    </p>
                    {company.roles.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {company.roles.map((role) => (
                          <span
                            key={role.id}
                            className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                          >
                            {role.nombre}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    {selectedCompanyId === company.id ? (
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <p className="text-center text-xs text-slate-500">
              ¿No ves tu empresa? Contacta al administrador del sistema.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          © 2026 AGM - Gestión de Compras. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
