'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchProveedor, type Proveedor } from '@/lib/proveedores-api';
import { ProveedorForm } from '../_components/proveedor-form';
import { Loader2 } from 'lucide-react';

export default function ProveedorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [proveedor, setProveedor] = useState<Proveedor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchProveedor(id);
        setProveedor(data);
      } catch {
        setError('Proveedor no encontrado');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !proveedor) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4">
        <p className="text-gray-500">{error || 'Proveedor no encontrado'}</p>
        <button
          onClick={() => router.push('/dashboard/proveedores')}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
        >
          Volver a Proveedores
        </button>
      </div>
    );
  }

  return (
    <ProveedorForm
      proveedor={proveedor}
      onSave={async () => {}}
      saving={false}
      error={null}
      onClearError={() => {}}
      readOnly
    />
  );
}
