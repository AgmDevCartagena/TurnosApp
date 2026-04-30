'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ChevronDown } from 'lucide-react';
import { useCompanyStore } from '@/lib/company-store';

export function CompanySelector() {
  const router = useRouter();
  const { companies, activeCompany, selectCompany, fetchUserContext } = useCompanyStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUserContext()
      .then((context) => {
        console.log('Contexto de empresas cargado:', context);
      })
      .catch((err) => {
        console.error('Error al cargar contexto de empresas:', err);
      });
  }, [fetchUserContext]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectCompany = async (companyId: string) => {
    if (companyId === activeCompany?.id) {
      setIsOpen(false);
      return;
    }

    setIsChanging(true);
    try {
      await selectCompany(companyId);
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error('Error al cambiar empresa:', error);
    } finally {
      setIsChanging(false);
    }
  };

  if (companies.length === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex flex-col items-start">
        <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-gray-600">
          <Building2 className="h-3.5 w-3.5" />
          EMPRESA
        </label>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isChanging}
          className="flex min-w-[240px] items-center justify-between rounded-md border border-blue-400 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50"
        >
          <span className="truncate">
            {activeCompany ? activeCompany.nombre : 'Seleccionar empresa'}
          </span>
          <ChevronDown className={`ml-2 h-4 w-4 text-blue-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 w-[280px] rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="max-h-[320px] overflow-y-auto">
            {companies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleSelectCompany(company.id)}
                disabled={isChanging}
                className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors ${
                  company.id === activeCompany?.id
                    ? 'bg-gray-600 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                } disabled:opacity-50`}
              >
                <span className="truncate">{company.nombre}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
