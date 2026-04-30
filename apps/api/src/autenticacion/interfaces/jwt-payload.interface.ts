export interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
  nombre: string;
  apellido: string;
  rol: {
    id: string;
    nombre: string;
  };
  permisos: string[];
  empresas: Array<{ id: string; nombre: string }>;
}
