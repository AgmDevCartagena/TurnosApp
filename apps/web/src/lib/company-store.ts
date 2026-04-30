import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient from './api-client';
import { Company, UserContext } from '@/types/company';

interface CompanyState {
  companies: Company[];
  activeCompany: Company | null;
  activeRoles: string[];
  activePermissions: string[];
  isLoading: boolean;
  requiresSelection: boolean;

  fetchUserContext: () => Promise<UserContext>;
  selectCompany: (companyId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string) => boolean;
  clearCompanyContext: () => void;
}

export const useCompanyStore = create<CompanyState>()(
  persist(
    (set, get) => ({
      companies: [],
      activeCompany: null,
      activeRoles: [],
      activePermissions: [],
      isLoading: false,
      requiresSelection: false,

      fetchUserContext: async () => {
        set({ isLoading: true });
        console.log('📡 Fetching user context from /auth/me...');
        try {
          const { data } = await apiClient.get('/auth/me');
          console.log('✅ User context received:', data);
          const context = data.data ?? data;

          set({
            companies: context.companies,
            activeCompany: context.activeCompany,
            activeRoles: context.activeRoles,
            activePermissions: context.activePermissions,
            requiresSelection: context.requiresCompanySelection,
            isLoading: false,
          });

          return context;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      selectCompany: async (companyId: string) => {
        set({ isLoading: true });
        try {
          const { data } = await apiClient.post('/auth/select-company', {
            companyId,
          });
          const result = data.data ?? data;

          const company = get().companies.find(c => c.id === companyId);

          set({
            activeCompany: company || null,
            activeRoles: result.activeRoles.map((r: any) => r.codigo),
            activePermissions: result.activePermissions,
            requiresSelection: false,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      hasPermission: (permission: string) => {
        const { activePermissions } = get();
        return activePermissions.includes(permission);
      },

      hasRole: (role: string) => {
        const { activeRoles } = get();
        return activeRoles.includes(role);
      },

      clearCompanyContext: () => {
        set({
          companies: [],
          activeCompany: null,
          activeRoles: [],
          activePermissions: [],
          requiresSelection: false,
        });
      },
    }),
    {
      name: 'company-storage',
      partialize: (state) => ({
        activeCompany: state.activeCompany,
        companies: state.companies,
        activeRoles: state.activeRoles,
        activePermissions: state.activePermissions,
      }),
    },
  ),
);
