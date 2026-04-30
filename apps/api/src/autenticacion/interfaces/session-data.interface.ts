export interface SessionData {
  userId: string;
  email: string;
  authProvider: string;
  activeCompanyId: string | null;
  companies: CompanyAccess[];
  activeRoles: string[];
  activePermissions: string[];
  createdAt: number;
  lastActivity: number;
}

export interface CompanyAccess {
  id: string;
  nombre: string;
  nit: string;
  roles: RoleInfo[];
}

export interface RoleInfo {
  id: string;
  codigo: string;
  nombre: string;
}
