# Plataforma Control de Compras AGM

Suite empresarial para la gestión integral del ciclo de compras: solicitudes, aprobaciones, órdenes de compra, proveedores, inventarios y documentos.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS, shadcn/ui |
| **Backend** | NestJS 10, TypeScript, Prisma ORM |
| **Base de datos** | PostgreSQL 16, Redis 7 |
| **Monorepo** | Turborepo + pnpm |
| **Validación** | Zod (compartida front/back) |

## Estructura del Proyecto

```
├── apps/
│   ├── api/          # NestJS — API REST
│   └── web/          # Next.js — Frontend
├── packages/
│   ├── config/       # ESLint, TypeScript, Prettier configs
│   ├── shared/       # Tipos, enums, schemas Zod, utilidades
│   └── ui/           # Componentes UI (shadcn/ui base)
├── docker/           # Docker Compose (PostgreSQL, Redis)
└── docs/             # Documentación técnica
```

## Requisitos Previos

- **Node.js** >= 20 LTS
- **pnpm** >= 9
- **Docker** y **Docker Compose** (para PostgreSQL y Redis)

## Inicio Rápido

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd AppGestionCompras
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con tus valores (DB, Redis, JWT secrets, etc.)

### 3. Levantar servicios con Docker

```bash
docker compose -f docker/docker-compose.yml up -d
```

### 4. Ejecutar migraciones y seed

```bash
pnpm db:push
pnpm db:seed
```

### 5. Iniciar en modo desarrollo

```bash
pnpm dev
```

- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Swagger**: http://localhost:3001/api/docs

### Credenciales por defecto

| Email | Contraseña | Rol |
|-------|-----------|-----|
| admin@gestion-compras.com | Admin123! | Super Admin |

## Scripts Disponibles

| Script | Descripción |
|--------|------------|
| `pnpm dev` | Inicia todos los servicios en modo desarrollo |
| `pnpm build` | Compila todos los paquetes y apps |
| `pnpm lint` | Ejecuta ESLint en todo el monorepo |
| `pnpm test` | Ejecuta tests en todo el monorepo |
| `pnpm format` | Formatea código con Prettier |
| `pnpm clean` | Limpia artefactos de build |
| `pnpm db:push` | Sincroniza schema Prisma con la BD |
| `pnpm db:seed` | Ejecuta seed de datos iniciales |
| `pnpm db:studio` | Abre Prisma Studio |

## Dominios del Sistema

- **Autenticación** — JWT + Refresh tokens + RBAC
- **Administración** — Usuarios, roles, permisos, centros de costo
- **Proveedores** — Registro, evaluación, documentos
- **Catálogo** — Bienes, servicios, categorías
- **Solicitudes** — Creación y gestión de solicitudes de compra
- **Aprobaciones** — Flujos de aprobación multinivel
- **Compras** — Órdenes de compra, seguimiento
- **Inventarios** — Control de stock, movimientos
- **Documentos** — Gestión documental con versionado
- **Reportes** — Dashboards y reportes analíticos
- **Notificaciones** — Alertas en tiempo real

## Documentación

Ver [docs/AUDITORIA_TECNICA.md](docs/AUDITORIA_TECNICA.md) para la auditoría técnica completa con arquitectura, patrones de diseño, modelo de datos y roadmap.
