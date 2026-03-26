'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createProveedor } from '@/lib/proveedores-api';
import { ProveedorForm } from '../_components/proveedor-form';

export default function NuevoProveedorPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (data: any, estado: string) => {
    setSaving(true);
    setError(null);
    try {
      await createProveedor({ ...data, estado });
      router.push('/dashboard/proveedores');
    } catch (err: any) {
      setError(
        err?.response?.data?.message || 'Error al crear el proveedor',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProveedorForm
      onSave={handleSave}
      saving={saving}
      error={error}
      onClearError={() => setError(null)}
    />
  );
}
