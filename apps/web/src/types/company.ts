export interface Company {
  id: string;
  nombre: string;
  nit: string;
  razonSocial: string;
  roles: Role[];
}

export interface Role {
  id: string;
  codigo: string;
  nombre: string;
}

export interface UserContext {
  user: {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    username: string;
  };
  companies: Company[];
  activeCompany: Company | null;
  activeRoles: string[];
  activePermissions: string[];
  requiresCompanySelection: boolean;
}
