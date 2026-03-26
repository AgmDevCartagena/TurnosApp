# 🏗️ Auditoría Técnica — Plataforma Control de Compras AGM

> **Versión:** 1.0  
> **Fecha:** 2026-02-12  
> **Autor:** Equipo de Arquitectura  
> **Estado:** Documento base para inicio de desarrollo

---

## Tabla de Contenidos

1. [Análisis del Mapa Mental](#1-análisis-del-mapa-mental)
2. [Dominios del Negocio (Bounded Contexts)](#2-dominios-del-negocio-bounded-contexts)
3. [Stack Tecnológico Validado](#3-stack-tecnológico-validado)
4. [Arquitectura: Monorepo + Screaming Architecture](#4-arquitectura-monorepo--screaming-architecture)
5. [Estructura de Carpetas Detallada](#5-estructura-de-carpetas-detallada)
6. [Patrones de Diseño y Principios](#6-patrones-de-diseño-y-principios)
7. [Modelo de Datos por Dominio](#7-modelo-de-datos-por-dominio)
8. [Flujos Críticos del Sistema](#8-flujos-críticos-del-sistema)
9. [Estrategia de Autenticación y Autorización](#9-estrategia-de-autenticación-y-autorización)
10. [Estrategia de Testing](#10-estrategia-de-testing)
11. [Observabilidad y Logging](#11-observabilidad-y-logging)
12. [Plan de Escalabilidad](#12-plan-de-escalabilidad)
13. [Roadmap de Implementación por Fases](#13-roadmap-de-implementación-por-fases)
14. [Decisiones Arquitectónicas (ADR)](#14-decisiones-arquitectónicas-adr)
15. [Riesgos y Mitigaciones](#15-riesgos-y-mitigaciones)

---

## 1. Análisis del Mapa Mental

### 1.1 Nodo Raíz
**Plataforma Control de Compras AGM** — Sistema empresarial para gestión integral del ciclo de compras.

### 1.2 Ramas Principales Identificadas

| # | Rama | Descripción |
|---|------|-------------|
| 1 | **Objetivos Principales** | Metas estratégicas del sistema |
| 2 | **Funcionalidades del Sistema** | Módulos operativos core |
| 3 | **Control y Seguimiento** | Monitoreo, alertas, KPIs |
| 4 | **Administración del Sistema** | Configuración, roles, reglas |
| 5 | **Entregables** | Software + documentación |

### 1.3 Desglose Completo de Funcionalidades

#### 1.3.1 Objetivos Principales
- Centralizar solicitudes y aprobaciones
- Administrar proveedores
- Estandarizar categorías
- Asegurar trazabilidad
- Generar reportes e indicadores

#### 1.3.2 Funcionalidades del Sistema

**A. Gestión de Bienes y Servicios (Catálogo)**
- Definición de categorías
- Caracterización técnica de productos/servicios
- Estandarización de entregas

**B. Solicitud de Compra**
- Flujos de aprobación (multinivel)
- Registro de solicitantes
- Historial y trazabilidad completa

**C. Proceso de Compras**
- Ciclo completo de compra (solicitud → recepción)
- Órdenes de compra
- Registro de responsables por etapa

**D. Gestión de Proveedores**
- Maestro de proveedores
- Evaluación de desempeño
- Control de documentos y vigencias

**E. Módulo Documental**
- Repositorio central de documentos
- Control de versiones
- Acceso por permisos (roles)

**F. Inventarios**
- Actualización automática de existencias
- Asociación a centros de costo

#### 1.3.3 Control y Seguimiento
- Notificaciones y alertas automáticas
- Reportes ejecutivos y gerenciales
- Gestión de novedades e incidencias
- KPIs de procesos y proveedores

#### 1.3.4 Administración del Sistema
- Gestión de roles y perfiles
- Configuración de reglas de negocio
- Parametrización de flujos de aprobación

#### 1.3.5 Entregables
- Software de Gestión de Compras (esta plataforma)
- Documento de usuario (manual)

---

## 2. Dominios del Negocio (Bounded Contexts)

Derivados del mapa mental, estos son los **bounded contexts** que se traducen en carpetas raíz (screaming architecture):

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOUNDED CONTEXTS                              │
├──────────────────┬──────────────────────────────────────────────┤
│ Dominio          │ Responsabilidad                              │
├──────────────────┼──────────────────────────────────────────────┤
│ autenticacion    │ Login, JWT, sesiones, refresh tokens         │
│ administracion   │ Roles, perfiles, reglas de negocio, params  │
│ proveedores      │ CRUD maestro, evaluación, documentos vigenc │
│ catalogo         │ Bienes, servicios, categorías, specs técnic │
│ solicitudes      │ Creación, registro solicitantes, historial  │
│ aprobaciones     │ Flujos multinivel, parametrización, estados │
│ compras          │ Órdenes de compra, ciclo completo, respons  │
│ inventarios      │ Existencias, centros de costo, movimientos  │
│ documentos       │ Repositorio, versionado, permisos acceso    │
│ reportes         │ KPIs, dashboards, reportes ejecutivos       │
│ notificaciones   │ Alertas, emails, push, novedades            │
└──────────────────┴──────────────────────────────────────────────┘
```

### 2.1 Mapa de Dependencias entre Dominios

```
autenticacion ──────► administracion
                           │
                           ▼
                    ┌──────────────┐
                    │  proveedores │◄──── documentos
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
         catalogo    solicitudes   inventarios
              │            │
              ▼            ▼
         compras ◄── aprobaciones
              │
              ├──► reportes
              └──► notificaciones
```

### 2.2 Reglas de Dependencia
- **autenticacion** → No depende de nadie. Todos dependen de él.
- **administracion** → Depende solo de autenticacion.
- **proveedores** → Depende de administracion (roles) y documentos.
- **catalogo** → Depende de administracion.
- **solicitudes** → Depende de catalogo, administracion.
- **aprobaciones** → Depende de solicitudes, administracion.
- **compras** → Depende de solicitudes, aprobaciones, proveedores, catalogo.
- **inventarios** → Depende de compras, catalogo.
- **documentos** → Dominio transversal (compartido).
- **reportes** → Lee de todos los dominios (solo lectura).
- **notificaciones** → Dominio transversal, activado por eventos.

---

## 3. Stack Tecnológico Validado

### 3.1 Frontend

| Tecnología | Versión | Justificación |
|------------|---------|---------------|
| **Next.js** | 14+ (App Router) | SSR/SSG, routing basado en archivos, RSC |
| **React** | 19 | Concurrent features, use() hook, Server Components |
| **TypeScript** | 5.x | Type safety end-to-end |
| **Tailwind CSS** | 3.x | Utility-first, design system consistente |
| **shadcn/ui** | latest | Componentes accesibles, customizables, no lock-in |
| **TanStack Query** | 5.x | Cache, revalidación, optimistic updates |
| **Zod** | 3.x | Validación runtime + inferencia de tipos |
| **React Hook Form** | 7.x | Performance en formularios complejos |
| **Zustand** | 4.x | Estado global ligero (complemento a TanStack Query) |
| **Lucide React** | latest | Iconografía consistente |

### 3.2 Backend

| Tecnología | Versión | Justificación |
|------------|---------|---------------|
| **Node.js** | 20 LTS | Estabilidad, soporte largo plazo |
| **NestJS** | 10 | DI nativa, modular, decoradores, guards |
| **TypeScript** | 5.x | Consistencia con frontend |
| **Prisma** | 5.x | Type-safe ORM, migraciones, introspección |
| **PostgreSQL** | 16 | ACID, JSON, full-text search, partitioning |
| **Redis** | 7.x | Cache, sesiones, pub/sub para eventos |
| **BullMQ** | 4.x | Colas de trabajo (emails, reportes, sync) |
| **Pino** | 8.x | Logging estructurado, alto rendimiento |
| **Passport.js** | 0.7+ | Estrategias JWT, OAuth |

### 3.3 Infraestructura / DevOps

| Tecnología | Uso |
|------------|-----|
| **Turborepo** | Monorepo build system, caching |
| **pnpm** | Package manager (workspaces) |
| **Docker** | Contenedores para dev y producción |
| **Docker Compose** | Orquestación local (PG, Redis, API, Web) |
| **GitHub Actions** | CI/CD pipelines |
| **ESLint + Prettier** | Linting y formato compartido |
| **Husky + lint-staged** | Pre-commit hooks |
| **Vitest** | Unit testing (frontend + backend) |
| **Playwright** | E2E testing |
| **Swagger/OpenAPI** | Documentación API automática |

### 3.4 Validación de Compatibilidad

```
✅ Next.js 14 + React 19        → Compatible (App Router + RSC)
✅ NestJS 10 + Prisma 5         → Compatible (decoradores + type-safe)
✅ Zod compartido front/back    → Validación unificada via packages/shared
✅ TanStack Query + Next.js     → Compatible (prefetching SSR)
✅ Turborepo + pnpm workspaces  → Estándar de la industria para monorepos
✅ BullMQ + Redis               → Stack probado para jobs async
✅ Pino + NestJS                → Integración nativa via LoggerService
```

---

## 4. Arquitectura: Monorepo + Screaming Architecture

### 4.1 ¿Por qué Monorepo?

| Beneficio | Detalle |
|-----------|---------|
| **Código compartido** | Tipos, DTOs, validaciones Zod, utils — una sola fuente de verdad |
| **Refactoring atómico** | Cambiar un DTO impacta front y back en un solo commit |
| **CI/CD unificado** | Un pipeline, builds incrementales con Turborepo |
| **Consistencia** | ESLint, tsconfig, prettier — configuración centralizada |
| **Escalabilidad** | Mañana se puede extraer un dominio a su propia app sin romper nada |

### 4.2 ¿Por qué Screaming Architecture?

> "La arquitectura debe gritar el propósito del sistema, no el framework."  
> — Robert C. Martin

- Las carpetas raíz son **dominios del negocio**, no capas técnicas.
- Cualquier desarrollador nuevo entiende el sistema con solo ver `src/`.
- Cada dominio es autónomo: tiene su propia capa de dominio, aplicación, infraestructura y presentación.

### 4.3 Capas dentro de cada Dominio (Clean Architecture)

```
dominio/
├── domain/           → Entidades, Value Objects, interfaces de repositorio
│   ├── entities/
│   ├── value-objects/
│   ├── repositories/   (interfaces/puertos)
│   └── events/
├── application/      → Casos de uso, DTOs, servicios de aplicación
│   ├── use-cases/
│   ├── dtos/
│   ├── mappers/
│   └── ports/          (interfaces de servicios externos)
├── infrastructure/   → Implementaciones concretas (Prisma, Redis, etc.)
│   ├── persistence/
│   ├── services/
│   └── mappers/
└── presentation/     → Controllers, Guards, Decorators (NestJS)
    ├── controllers/
    ├── guards/
    └── decorators/
```

**Regla de dependencia (Dependency Rule):**
```
presentation → application → domain
                    ↑
             infrastructure
```
- `domain` NO importa de ninguna otra capa.
- `application` solo importa de `domain`.
- `infrastructure` implementa interfaces de `domain` y `application`.
- `presentation` orquesta llamando a `application`.

---

## 5. Estructura de Carpetas Detallada

### 5.1 Raíz del Monorepo

```
gestion-compras/
│
├── apps/
│   ├── web/                          → Next.js 14 (Frontend)
│   └── api/                          → NestJS 10 (Backend)
│
├── packages/
│   ├── ui/                           → Componentes React compartidos (shadcn/ui custom)
│   ├── shared/                       → Tipos, DTOs Zod, constantes, enums
│   └── config/                       → ESLint, tsconfig, prettier configs
│
├── docker/
│   ├── docker-compose.yml
│   ├── Dockerfile.api
│   └── Dockerfile.web
│
├── docs/
│   ├── AUDITORIA_TECNICA.md          → Este documento
│   ├── ADR/                          → Architecture Decision Records
│   └── api/                          → Swagger exports
│
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
│
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

### 5.2 Backend — `apps/api/`

```
apps/api/
├── src/
│   │
│   ├── autenticacion/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── usuario.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── email.vo.ts
│   │   │   │   └── password-hash.vo.ts
│   │   │   └── repositories/
│   │   │       └── usuario.repository.interface.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── login.use-case.ts
│   │   │   │   ├── register.use-case.ts
│   │   │   │   ├── refresh-token.use-case.ts
│   │   │   │   └── logout.use-case.ts
│   │   │   ├── dtos/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── register.dto.ts
│   │   │   └── ports/
│   │   │       ├── hasher.port.ts
│   │   │       └── token.port.ts
│   │   ├── infrastructure/
│   │   │   ├── persistence/
│   │   │   │   └── prisma-usuario.repository.ts
│   │   │   ├── services/
│   │   │   │   ├── bcrypt-hasher.service.ts
│   │   │   │   └── jwt-token.service.ts
│   │   │   └── guards/
│   │   │       ├── jwt-auth.guard.ts
│   │   │       └── roles.guard.ts
│   │   ├── presentation/
│   │   │   └── controllers/
│   │   │       └── auth.controller.ts
│   │   └── autenticacion.module.ts
│   │
│   ├── administracion/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── rol.entity.ts
│   │   │   │   ├── perfil.entity.ts
│   │   │   │   └── regla-negocio.entity.ts
│   │   │   └── repositories/
│   │   │       ├── rol.repository.interface.ts
│   │   │       └── regla-negocio.repository.interface.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── crear-rol.use-case.ts
│   │   │   │   ├── asignar-perfil.use-case.ts
│   │   │   │   ├── configurar-regla.use-case.ts
│   │   │   │   └── parametrizar-flujo.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   │   └── persistence/
│   │   ├── presentation/
│   │   │   └── controllers/
│   │   │       ├── roles.controller.ts
│   │   │       └── configuracion.controller.ts
│   │   └── administracion.module.ts
│   │
│   ├── proveedores/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── proveedor.entity.ts
│   │   │   │   └── evaluacion-proveedor.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── nit.vo.ts
│   │   │   │   └── estado-proveedor.vo.ts
│   │   │   ├── repositories/
│   │   │   │   └── proveedor.repository.interface.ts
│   │   │   └── events/
│   │   │       ├── proveedor-creado.event.ts
│   │   │       └── proveedor-evaluado.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── registrar-proveedor.use-case.ts
│   │   │   │   ├── evaluar-proveedor.use-case.ts
│   │   │   │   ├── listar-proveedores.use-case.ts
│   │   │   │   └── verificar-vigencias.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   │   └── persistence/
│   │   ├── presentation/
│   │   │   └── controllers/
│   │   │       └── proveedores.controller.ts
│   │   └── proveedores.module.ts
│   │
│   ├── catalogo/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── categoria.entity.ts
│   │   │   │   ├── bien.entity.ts
│   │   │   │   └── servicio.entity.ts
│   │   │   └── repositories/
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── crear-categoria.use-case.ts
│   │   │   │   ├── registrar-bien.use-case.ts
│   │   │   │   └── definir-specs-tecnicas.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── catalogo.module.ts
│   │
│   ├── solicitudes/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── solicitud-compra.entity.ts
│   │   │   │   └── linea-solicitud.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   └── estado-solicitud.vo.ts
│   │   │   ├── repositories/
│   │   │   └── events/
│   │   │       ├── solicitud-creada.event.ts
│   │   │       └── solicitud-enviada.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── crear-solicitud.use-case.ts
│   │   │   │   ├── enviar-solicitud.use-case.ts
│   │   │   │   ├── consultar-historial.use-case.ts
│   │   │   │   └── cancelar-solicitud.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── solicitudes.module.ts
│   │
│   ├── aprobaciones/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── flujo-aprobacion.entity.ts
│   │   │   │   ├── paso-aprobacion.entity.ts
│   │   │   │   └── decision.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   └── estado-aprobacion.vo.ts
│   │   │   ├── repositories/
│   │   │   └── events/
│   │   │       ├── aprobacion-otorgada.event.ts
│   │   │       └── aprobacion-rechazada.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── aprobar.use-case.ts
│   │   │   │   ├── rechazar.use-case.ts
│   │   │   │   ├── escalar.use-case.ts
│   │   │   │   └── consultar-pendientes.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── aprobaciones.module.ts
│   │
│   ├── compras/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── orden-compra.entity.ts
│   │   │   │   ├── linea-orden.entity.ts
│   │   │   │   └── recepcion.entity.ts
│   │   │   ├── value-objects/
│   │   │   │   ├── estado-orden.vo.ts
│   │   │   │   └── numero-orden.vo.ts
│   │   │   ├── repositories/
│   │   │   └── events/
│   │   │       ├── orden-creada.event.ts
│   │   │       ├── orden-enviada.event.ts
│   │   │       └── recepcion-confirmada.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── generar-orden.use-case.ts
│   │   │   │   ├── enviar-orden-proveedor.use-case.ts
│   │   │   │   ├── registrar-recepcion.use-case.ts
│   │   │   │   └── cerrar-orden.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── compras.module.ts
│   │
│   ├── inventarios/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── item-inventario.entity.ts
│   │   │   │   ├── movimiento.entity.ts
│   │   │   │   └── centro-costo.entity.ts
│   │   │   ├── repositories/
│   │   │   └── events/
│   │   │       └── stock-actualizado.event.ts
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── actualizar-existencias.use-case.ts
│   │   │   │   ├── consultar-stock.use-case.ts
│   │   │   │   └── asociar-centro-costo.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   ├── presentation/
│   │   └── inventarios.module.ts
│   │
│   ├── documentos/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   ├── documento.entity.ts
│   │   │   │   └── version-documento.entity.ts
│   │   │   ├── repositories/
│   │   │   └── events/
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── subir-documento.use-case.ts
│   │   │   │   ├── crear-version.use-case.ts
│   │   │   │   └── descargar-documento.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   │   └── storage/
│   │   │       └── s3-storage.service.ts
│   │   ├── presentation/
│   │   └── documentos.module.ts
│   │
│   ├── reportes/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── reporte.entity.ts
│   │   │   └── repositories/
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── generar-reporte-ejecutivo.use-case.ts
│   │   │   │   ├── generar-kpi-proveedores.use-case.ts
│   │   │   │   ├── generar-kpi-procesos.use-case.ts
│   │   │   │   └── exportar-reporte.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   │   └── generators/
│   │   │       ├── pdf-generator.service.ts
│   │   │       └── excel-generator.service.ts
│   │   ├── presentation/
│   │   └── reportes.module.ts
│   │
│   ├── notificaciones/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── notificacion.entity.ts
│   │   │   └── repositories/
│   │   ├── application/
│   │   │   ├── use-cases/
│   │   │   │   ├── enviar-email.use-case.ts
│   │   │   │   ├── enviar-push.use-case.ts
│   │   │   │   └── registrar-alerta.use-case.ts
│   │   │   └── dtos/
│   │   ├── infrastructure/
│   │   │   ├── email/
│   │   │   │   └── smtp-email.service.ts
│   │   │   └── queues/
│   │   │       └── notification-queue.processor.ts
│   │   ├── presentation/
│   │   └── notificaciones.module.ts
│   │
│   ├── common/                       → Código transversal (NO es un dominio)
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── pipes/
│   │   │   └── zod-validation.pipe.ts
│   │   ├── guards/
│   │   │   └── throttle.guard.ts
│   │   └── interfaces/
│   │       ├── paginated-response.interface.ts
│   │       └── base-repository.interface.ts
│   │
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   └── prisma.service.ts
│   │
│   ├── config/
│   │   ├── app.config.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   ├── jwt.config.ts
│   │   └── mail.config.ts
│   │
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── nest-cli.json
├── tsconfig.json
├── tsconfig.build.json
└── package.json
```

### 5.3 Frontend — `apps/web/`

```
apps/web/
├── src/
│   ├── app/                          → Next.js App Router
│   │   ├── (auth)/                   → Grupo: páginas públicas
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (dashboard)/              → Grupo: páginas protegidas
│   │   │   ├── layout.tsx            → Sidebar + Header + Auth guard
│   │   │   ├── page.tsx              → Dashboard principal
│   │   │   │
│   │   │   ├── proveedores/
│   │   │   │   ├── page.tsx          → Lista de proveedores
│   │   │   │   ├── nuevo/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── [id]/
│   │   │   │   │   ├── page.tsx      → Detalle
│   │   │   │   │   └── editar/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── evaluaciones/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── catalogo/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── categorias/
│   │   │   │   └── [id]/
│   │   │   │
│   │   │   ├── solicitudes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── nueva/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── aprobaciones/
│   │   │   │   ├── page.tsx          → Bandeja de aprobaciones
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── compras/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── ordenes/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── nueva/
│   │   │   │   │   └── [id]/
│   │   │   │   └── recepciones/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── inventarios/
│   │   │   │   ├── page.tsx
│   │   │   │   └── movimientos/
│   │   │   │       └── page.tsx
│   │   │   │
│   │   │   ├── documentos/
│   │   │   │   └── page.tsx
│   │   │   │
│   │   │   ├── reportes/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── kpis/
│   │   │   │   └── ejecutivos/
│   │   │   │
│   │   │   └── administracion/
│   │   │       ├── roles/
│   │   │       │   └── page.tsx
│   │   │       ├── configuracion/
│   │   │       │   └── page.tsx
│   │   │       └── flujos/
│   │   │           └── page.tsx
│   │   │
│   │   ├── api/                      → Route handlers (BFF si necesario)
│   │   ├── layout.tsx                → Root layout
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   └── globals.css
│   │
│   ├── modules/                      → Lógica por dominio (screaming en frontend)
│   │   ├── proveedores/
│   │   │   ├── components/
│   │   │   │   ├── proveedor-form.tsx
│   │   │   │   ├── proveedor-table.tsx
│   │   │   │   ├── proveedor-card.tsx
│   │   │   │   └── evaluacion-form.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── use-proveedores.ts
│   │   │   │   └── use-proveedor.ts
│   │   │   ├── services/
│   │   │   │   └── proveedores.service.ts
│   │   │   └── types/
│   │   │       └── proveedor.types.ts
│   │   │
│   │   ├── solicitudes/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types/
│   │   │
│   │   ├── compras/
│   │   ├── aprobaciones/
│   │   ├── inventarios/
│   │   ├── catalogo/
│   │   ├── documentos/
│   │   ├── reportes/
│   │   ├── administracion/
│   │   └── autenticacion/
│   │       ├── components/
│   │       │   ├── login-form.tsx
│   │       │   └── register-form.tsx
│   │       ├── hooks/
│   │       │   └── use-auth.ts
│   │       ├── services/
│   │       │   └── auth.service.ts
│   │       ├── providers/
│   │       │   └── auth-provider.tsx
│   │       └── types/
│   │
│   ├── shared/                       → Utilidades compartidas del frontend
│   │   ├── components/
│   │   │   ├── data-table.tsx
│   │   │   ├── page-header.tsx
│   │   │   ├── confirm-dialog.tsx
│   │   │   └── loading-skeleton.tsx
│   │   ├── hooks/
│   │   │   ├── use-debounce.ts
│   │   │   └── use-pagination.ts
│   │   ├── lib/
│   │   │   ├── api-client.ts         → Axios/fetch wrapper
│   │   │   ├── query-client.ts       → TanStack Query config
│   │   │   └── utils.ts
│   │   └── providers/
│   │       ├── query-provider.tsx
│   │       └── theme-provider.tsx
│   │
│   └── middleware.ts                 → Auth middleware (protección de rutas)
│
├── public/
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── postcss.config.js
└── package.json
```

### 5.4 Packages Compartidos

```
packages/
├── shared/
│   ├── src/
│   │   ├── schemas/                  → Zod schemas (validación compartida)
│   │   │   ├── proveedor.schema.ts
│   │   │   ├── solicitud.schema.ts
│   │   │   ├── orden-compra.schema.ts
│   │   │   ├── usuario.schema.ts
│   │   │   └── index.ts
│   │   ├── types/                    → TypeScript types/interfaces
│   │   │   ├── api-response.type.ts
│   │   │   ├── pagination.type.ts
│   │   │   └── index.ts
│   │   ├── constants/
│   │   │   ├── estados.ts
│   │   │   ├── roles.ts
│   │   │   └── index.ts
│   │   ├── enums/
│   │   │   ├── estado-solicitud.enum.ts
│   │   │   ├── estado-orden.enum.ts
│   │   │   ├── tipo-documento.enum.ts
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── formatters.ts
│   │       └── validators.ts
│   ├── package.json
│   └── tsconfig.json
│
├── ui/
│   ├── src/
│   │   ├── components/               → shadcn/ui customizados
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   └── index.ts
│   │   └── lib/
│   │       └── utils.ts
│   ├── package.json
│   └── tsconfig.json
│
└── config/
    ├── eslint/
    │   ├── base.js
    │   ├── next.js
    │   └── nest.js
    ├── typescript/
    │   ├── base.json
    │   ├── next.json
    │   └── nest.json
    ├── prettier/
    │   └── index.js
    └── package.json
```

---

## 6. Patrones de Diseño y Principios

### 6.1 Principios SOLID Aplicados

| Principio | Aplicación en el Proyecto |
|-----------|--------------------------|
| **S** — Single Responsibility | Cada use-case hace UNA cosa. `CrearSolicitudUseCase` solo crea. |
| **O** — Open/Closed | Nuevos tipos de notificación se agregan implementando `NotificationPort`, sin modificar código existente. |
| **L** — Liskov Substitution | `PrismaProveedorRepository` sustituye a cualquier `ProveedorRepository` interface. |
| **I** — Interface Segregation | Interfaces pequeñas: `Readable<T>`, `Writable<T>`, no un mega `Repository<T>`. |
| **D** — Dependency Inversion | Use-cases dependen de interfaces (ports), no de Prisma directamente. |

### 6.2 Patrones Implementados

| Patrón | Dónde | Por qué |
|--------|-------|---------|
| **Repository** | `domain/repositories/` | Abstrae persistencia, permite cambiar de Prisma a otro ORM |
| **Use Case (Command/Query)** | `application/use-cases/` | Cada operación es un caso de uso explícito |
| **DTO (Data Transfer Object)** | `application/dtos/` | Desacopla entidades de dominio de la API |
| **Mapper** | `application/mappers/` | Transforma entre capas (entity ↔ DTO ↔ Prisma model) |
| **Value Object** | `domain/value-objects/` | Encapsula reglas de validación (Email, NIT, etc.) |
| **Domain Events** | `domain/events/` | Comunicación desacoplada entre dominios |
| **Port/Adapter** | `application/ports/` + `infrastructure/services/` | Hexagonal: el dominio define qué necesita, infra lo implementa |
| **Guard** | `infrastructure/guards/` | Autorización declarativa con decoradores NestJS |
| **Interceptor** | `common/interceptors/` | Cross-cutting: logging, transformación de respuesta |
| **Filter** | `common/filters/` | Manejo centralizado de excepciones |
| **Strategy** | Notificaciones, Reportes | Diferentes estrategias de envío/generación |
| **Observer** | Domain Events + BullMQ | Reaccionar a eventos sin acoplamiento |
| **Factory** | Creación de entidades complejas | Encapsula lógica de construcción |

### 6.3 Convenciones de Código

```typescript
// Naming conventions
// ─────────────────────────────────────────
// Archivos:        kebab-case          → crear-solicitud.use-case.ts
// Clases:          PascalCase          → CrearSolicitudUseCase
// Interfaces:      PascalCase (sin I)  → ProveedorRepository (no IProveedorRepository)
// Métodos:         camelCase           → ejecutar(), obtenerPorId()
// Variables:       camelCase           → solicitudActual
// Constantes:      UPPER_SNAKE_CASE    → ESTADOS_SOLICITUD
// Enums:           PascalCase          → EstadoSolicitud
// DTOs:            PascalCase + Dto    → CrearProveedorDto
// Eventos:         PascalCase + Event  → SolicitudCreadaEvent
// Value Objects:   PascalCase + VO     → EmailVO (o simplemente Email)

// Estructura de un Use Case
// ─────────────────────────────────────────
export class CrearSolicitudUseCase {
  constructor(
    private readonly solicitudRepo: SolicitudRepository,
    private readonly eventBus: EventBus,
  ) {}

  async ejecutar(dto: CrearSolicitudDto): Promise<SolicitudResponseDto> {
    // 1. Validar reglas de negocio
    // 2. Crear entidad de dominio
    // 3. Persistir
    // 4. Emitir evento
    // 5. Retornar DTO de respuesta
  }
}
```

---

## 7. Modelo de Datos por Dominio

### 7.1 Diagrama Entidad-Relación (Simplificado)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│   Usuario    │────►│     Rol      │────►│    Permiso       │
│──────────────│     │──────────────│     │──────────────────│
│ id           │     │ id           │     │ id               │
│ email        │     │ nombre       │     │ recurso          │
│ password     │     │ descripcion  │     │ accion           │
│ nombre       │     │ permisos[]   │     └──────────────────┘
│ rolId        │     └──────────────┘
│ activo       │
└──────┬───────┘
       │
       │ crea
       ▼
┌──────────────────┐     ┌──────────────────┐
│ SolicitudCompra  │────►│ FlujoAprobacion   │
│──────────────────│     │──────────────────│
│ id               │     │ id               │
│ numero           │     │ solicitudId      │
│ solicitanteId    │     │ pasos[]          │
│ estado           │     │ estadoActual     │
│ fechaCreacion    │     │ aprobadorActual  │
│ justificacion    │     └────────┬─────────┘
│ centroCostoId    │              │
│ lineas[]         │              ▼
└──────┬───────────┘     ┌──────────────────┐
       │                 │ PasoAprobacion    │
       │ genera          │──────────────────│
       ▼                 │ id               │
┌──────────────────┐     │ orden            │
│  OrdenCompra     │     │ aprobadorId      │
│──────────────────│     │ estado           │
│ id               │     │ comentario       │
│ numero           │     │ fechaDecision    │
│ solicitudId      │     └──────────────────┘
│ proveedorId      │
│ estado           │
│ fechaEmision     │
│ subtotal         │
│ impuestos        │
│ total            │
│ lineas[]         │
└──────┬───────────┘
       │
       │ se recibe en
       ▼
┌──────────────────┐     ┌──────────────────┐
│   Recepcion      │────►│ ItemInventario   │
│──────────────────│     │──────────────────│
│ id               │     │ id               │
│ ordenCompraId    │     │ bienId           │
│ fechaRecepcion   │     │ cantidad         │
│ recibidoPorId    │     │ centroCostoId    │
│ observaciones    │     │ ultimaActualiz   │
│ lineas[]         │     └──────────────────┘
└──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│   Proveedor      │────►│ EvalProveedor    │
│──────────────────│     │──────────────────│
│ id               │     │ id               │
│ razonSocial      │     │ proveedorId      │
│ nit              │     │ periodo          │
│ contacto         │     │ calidad          │
│ email            │     │ cumplimiento     │
│ telefono         │     │ precio           │
│ direccion        │     │ puntuacionTotal  │
│ estado           │     │ observaciones    │
│ documentos[]     │     └──────────────────┘
└──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│   Categoria      │────►│ Bien/Servicio    │
│──────────────────│     │──────────────────│
│ id               │     │ id               │
│ nombre           │     │ nombre           │
│ descripcion      │     │ categoriaId      │
│ codigo           │     │ especsTecnicas   │
│ padre (self-ref) │     │ unidadMedida     │
└──────────────────┘     │ activo           │
                         └──────────────────┘

┌──────────────────┐     ┌──────────────────┐
│   Documento      │────►│ VersionDocumento │
│──────────────────│     │──────────────────│
│ id               │     │ id               │
│ nombre           │     │ documentoId      │
│ tipo             │     │ version          │
│ entidadRef       │     │ url              │
│ entidadId        │     │ subidoPorId      │
│ versionActual    │     │ fechaSubida      │
└──────────────────┘     └──────────────────┘

┌──────────────────┐
│  Notificacion    │
│──────────────────│
│ id               │
│ tipo             │
│ destinatarioId   │
│ titulo           │
│ mensaje          │
│ leida            │
│ fechaCreacion    │
│ metadata (JSON)  │
└──────────────────┘
```

### 7.2 Índices Recomendados

```sql
-- Búsquedas frecuentes
CREATE INDEX idx_solicitud_estado ON solicitud_compra(estado);
CREATE INDEX idx_solicitud_solicitante ON solicitud_compra(solicitante_id);
CREATE INDEX idx_solicitud_fecha ON solicitud_compra(fecha_creacion DESC);

CREATE INDEX idx_orden_estado ON orden_compra(estado);
CREATE INDEX idx_orden_proveedor ON orden_compra(proveedor_id);
CREATE INDEX idx_orden_fecha ON orden_compra(fecha_emision DESC);

CREATE INDEX idx_proveedor_estado ON proveedor(estado);
CREATE INDEX idx_proveedor_nit ON proveedor(nit) UNIQUE;

CREATE INDEX idx_aprobacion_aprobador ON paso_aprobacion(aprobador_id, estado);
CREATE INDEX idx_notificacion_destinatario ON notificacion(destinatario_id, leida);

CREATE INDEX idx_inventario_bien ON item_inventario(bien_id);
CREATE INDEX idx_inventario_centro ON item_inventario(centro_costo_id);

CREATE INDEX idx_documento_entidad ON documento(entidad_ref, entidad_id);
```

---

## 8. Flujos Críticos del Sistema

### 8.1 Flujo de Solicitud → Aprobación → Orden de Compra

```
┌─────────┐    ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐
│Solicitante│──►│ Crear    │──►│ Enviar a     │──►│ Aprobador│──►│ Generar  │
│          │    │Solicitud │    │ Aprobación   │    │ Decide   │    │ Orden    │
└─────────┘    └──────────┘    └──────────────┘    └──────────┘    └──────────┘
                                      │                  │               │
                                      │            ┌─────┴─────┐        │
                                      │            │           │        ▼
                                      │         Aprobar    Rechazar  ┌──────────┐
                                      │            │           │     │ Enviar a │
                                      │            ▼           ▼     │Proveedor │
                                      │     ¿Último paso?  Notificar └──────────┘
                                      │       │        │   Solicitante     │
                                      │      Sí       No                   ▼
                                      │       │        │              ┌──────────┐
                                      │       ▼        ▼              │ Recepción│
                                      │   Aprobada  Siguiente        └──────────┘
                                      │              Paso                  │
                                      │                                    ▼
                                      │                              ┌──────────┐
                                      └──────────────────────────────│Inventario│
                                         (eventos async)            │Actualizar│
                                                                    └──────────┘
```

### 8.2 Eventos del Sistema (Event-Driven)

```typescript
// Eventos que disparan acciones automáticas
// ──────────────────────────────────────────

SolicitudCreadaEvent
  → Notificar al primer aprobador del flujo
  → Registrar en log de auditoría

AprobacionOtorgadaEvent
  → Si es último paso → marcar solicitud como aprobada
  → Si no → notificar siguiente aprobador
  → Registrar decisión en auditoría

AprobacionRechazadaEvent
  → Notificar al solicitante
  → Marcar solicitud como rechazada

OrdenCreadaEvent
  → Notificar al proveedor (si aplica)
  → Actualizar estado de solicitud

RecepcionConfirmadaEvent
  → Actualizar inventario automáticamente
  → Notificar al responsable de compras
  → Verificar si la orden está completa

ProveedorCreadoEvent
  → Solicitar documentos pendientes
  → Programar primera evaluación

DocumentoVencidoEvent (cron job)
  → Alertar al proveedor
  → Alertar al administrador
  → Cambiar estado del proveedor si es crítico
```

---

## 9. Estrategia de Autenticación y Autorización

### 9.1 Autenticación (JWT + Refresh Token)

```
┌─────────┐                    ┌─────────┐                    ┌─────────┐
│ Cliente  │                    │   API   │                    │  Redis  │
└────┬────┘                    └────┬────┘                    └────┬────┘
     │  POST /auth/login            │                              │
     │  { email, password }         │                              │
     │─────────────────────────────►│                              │
     │                              │  Validar credenciales        │
     │                              │  Generar access_token (15m)  │
     │                              │  Generar refresh_token (7d)  │
     │                              │──────────────────────────────►│
     │                              │  Guardar refresh en Redis    │
     │  { access_token,             │                              │
     │    refresh_token }           │                              │
     │◄─────────────────────────────│                              │
     │                              │                              │
     │  GET /api/recurso            │                              │
     │  Authorization: Bearer xxx   │                              │
     │─────────────────────────────►│                              │
     │                              │  Verificar JWT               │
     │  200 OK + data               │                              │
     │◄─────────────────────────────│                              │
     │                              │                              │
     │  POST /auth/refresh          │                              │
     │  { refresh_token }           │                              │
     │─────────────────────────────►│                              │
     │                              │──────────────────────────────►│
     │                              │  Validar refresh en Redis    │
     │                              │  Rotar tokens                │
     │  { new_access, new_refresh } │                              │
     │◄─────────────────────────────│                              │
```

### 9.2 Autorización (RBAC — Role-Based Access Control)

```typescript
// Roles base del sistema
enum RolSistema {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  JEFE_COMPRAS = 'jefe_compras',
  COMPRADOR = 'comprador',
  APROBADOR = 'aprobador',
  SOLICITANTE = 'solicitante',
  AUDITOR = 'auditor',        // Solo lectura
  PROVEEDOR = 'proveedor',    // Portal externo (futuro)
}

// Matriz de permisos (ejemplo)
// ────────────────────────────────────────────────────
// Recurso          | Acción  | Roles permitidos
// ────────────────────────────────────────────────────
// solicitudes      | crear   | solicitante, comprador, jefe_compras, admin
// solicitudes      | ver     | todos (filtrado por ownership)
// solicitudes      | aprobar | aprobador, jefe_compras, admin
// ordenes          | crear   | comprador, jefe_compras, admin
// ordenes          | aprobar | jefe_compras, admin
// proveedores      | crear   | comprador, jefe_compras, admin
// proveedores      | evaluar | jefe_compras, admin
// reportes         | ver     | jefe_compras, admin, auditor
// administracion   | *       | admin, super_admin
```

### 9.3 Middleware de Protección (Frontend)

```typescript
// middleware.ts (Next.js)
// Protege todas las rutas bajo /(dashboard)
// Redirige a /login si no hay token válido
// Verifica permisos por ruta usando metadata de roles
```

---

## 10. Estrategia de Testing

### 10.1 Pirámide de Tests

```
        ╱╲
       ╱ E2E ╲          → Playwright (flujos críticos)
      ╱────────╲         → 5-10 tests por flujo principal
     ╱Integration╲       → Supertest + TestContainers
    ╱──────────────╲     → Tests de API con DB real
   ╱   Unit Tests   ╲    → Vitest (use-cases, entities, VOs)
  ╱──────────────────╲   → 80%+ coverage en domain + application
 ╱────────────────────╲
```

### 10.2 Distribución por Capa

| Capa | Herramienta | Qué testear | Coverage objetivo |
|------|-------------|-------------|-------------------|
| **Domain** | Vitest | Entidades, VOs, reglas de negocio | 90%+ |
| **Application** | Vitest + mocks | Use cases, lógica de orquestación | 85%+ |
| **Infrastructure** | Vitest + TestContainers | Repositorios contra DB real | 70%+ |
| **Presentation** | Supertest | Controllers, guards, pipes | 75%+ |
| **Frontend components** | Vitest + Testing Library | Componentes, hooks | 70%+ |
| **E2E** | Playwright | Flujos completos usuario | Flujos críticos |

### 10.3 Tests E2E Prioritarios

1. Login → Dashboard → Crear solicitud → Enviar a aprobación
2. Aprobador recibe → Aprueba → Se genera orden de compra
3. Registrar proveedor → Subir documentos → Activar
4. Recepción de mercancía → Actualización automática de inventario
5. Generar reporte ejecutivo → Exportar PDF

---

## 11. Observabilidad y Logging

### 11.1 Logging Estructurado (Pino)

```typescript
// Formato de log
{
  "level": "info",
  "timestamp": "2026-02-12T14:30:00.000Z",
  "context": "CrearSolicitudUseCase",
  "message": "Solicitud creada exitosamente",
  "data": {
    "solicitudId": "uuid-xxx",
    "solicitanteId": "uuid-yyy",
    "estado": "borrador"
  },
  "requestId": "req-uuid-zzz",    // Trazabilidad por request
  "userId": "uuid-yyy",
  "duration": 45                    // ms
}
```

### 11.2 Niveles de Log por Entorno

| Nivel | Desarrollo | Staging | Producción |
|-------|-----------|---------|------------|
| `trace` | ✅ | ❌ | ❌ |
| `debug` | ✅ | ✅ | ❌ |
| `info` | ✅ | ✅ | ✅ |
| `warn` | ✅ | ✅ | ✅ |
| `error` | ✅ | ✅ | ✅ |
| `fatal` | ✅ | ✅ | ✅ |

### 11.3 Auditoría de Acciones

```typescript
// Toda acción de negocio se registra en tabla audit_log
interface AuditLog {
  id: string;
  accion: string;           // 'SOLICITUD_CREADA', 'ORDEN_APROBADA'
  entidad: string;          // 'solicitud_compra', 'orden_compra'
  entidadId: string;
  usuarioId: string;
  datosAntes: JSON | null;  // Estado previo
  datosDespues: JSON;       // Estado nuevo
  ip: string;
  userAgent: string;
  timestamp: Date;
}
```

---

## 12. Plan de Escalabilidad

### 12.1 Evolución Arquitectónica

```
═══════════════════════════════════════════════════════════════
  FASE 1 (Hoy)              FASE 2 (6-12 meses)
  Monolito Modular           Módulos Independientes
═══════════════════════════════════════════════════════════════

  Monorepo                   Monorepo
  ├── apps/                  ├── apps/
  │   ├── web/               │   ├── web/
  │   └── api/ (modular)     │   ├── api-core/
  │       ├── proveedores/   │   ├── api-compras/
  │       ├── compras/       │   ├── api-proveedores/
  │       ├── solicitudes/   │   └── api-reportes/
  │       └── ...            │
  └── packages/              └── packages/
      ├── shared/                ├── shared/
      └── ui/                    ├── ui/
                                 └── events/  ← contratos de eventos

═══════════════════════════════════════════════════════════════
  FASE 3 (12-24 meses)
  Microservicios (si se justifica)
═══════════════════════════════════════════════════════════════

  Monorepo (o multi-repo)
  ├── services/
  │   ├── auth-service/
  │   ├── compras-service/
  │   ├── proveedores-service/
  │   ├── inventarios-service/
  │   ├── notificaciones-service/
  │   └── reportes-service/
  ├── gateway/                ← API Gateway
  └── packages/
      ├── shared/
      └── events/
```

### 12.2 Preparación para Escalar (desde Fase 1)

| Aspecto | Decisión ahora | Facilita después |
|---------|---------------|------------------|
| **Domain Events** | Implementar EventBus in-memory | Migrar a RabbitMQ/Kafka |
| **Repository Pattern** | Interfaces en domain/ | Cambiar implementación sin tocar lógica |
| **DTOs compartidos** | packages/shared | Contratos entre servicios |
| **Módulos NestJS** | Un módulo por dominio | Extraer a app independiente |
| **Base de datos** | Un schema, tablas por dominio | Separar schemas → separar DBs |
| **Cache** | Redis desde el inicio | Ya listo para distribuido |
| **Colas** | BullMQ desde el inicio | Ya listo para workers independientes |

---

## 13. Roadmap de Implementación por Fases

### Fase 0 — Fundación (Semana 1-2)
```
□ Inicializar monorepo (Turborepo + pnpm)
□ Configurar ESLint, Prettier, tsconfig compartidos
□ Configurar Docker Compose (PostgreSQL, Redis)
□ Inicializar apps/api (NestJS) con estructura base
□ Inicializar apps/web (Next.js) con estructura base
□ Configurar Prisma + schema inicial
□ Configurar packages/shared con primeros schemas Zod
□ Configurar packages/ui con shadcn/ui base
□ Configurar CI básico (GitHub Actions: lint + test)
□ Seed de datos iniciales (roles, usuario admin)
```

### Fase 1 — Autenticación + Administración (Semana 3-4)
```
□ Módulo autenticacion (login, register, JWT, refresh)
□ Módulo administracion (roles, permisos, usuarios)
□ Frontend: Login, Register, Dashboard layout
□ Frontend: CRUD de roles y usuarios
□ Middleware de protección de rutas
□ Guards de autorización
□ Tests unitarios de domain + application
```

### Fase 2 — Catálogo + Proveedores (Semana 5-7)
```
□ Módulo catalogo (categorías, bienes, servicios)
□ Módulo proveedores (CRUD, documentos, vigencias)
□ Frontend: CRUD catálogo con tablas y filtros
□ Frontend: CRUD proveedores con formularios complejos
□ Módulo documentos (subida, versionado)
□ Integración de documentos con proveedores
□ Tests de integración (API)
```

### Fase 3 — Solicitudes + Aprobaciones (Semana 8-10)
```
□ Módulo solicitudes (crear, enviar, historial)
□ Módulo aprobaciones (flujos multinivel, decisiones)
□ Frontend: Crear solicitud (formulario multi-paso)
□ Frontend: Bandeja de aprobaciones
□ Módulo notificaciones (emails, alertas in-app)
□ Integración de eventos (solicitud → aprobación → notificación)
□ Tests E2E del flujo completo
```

### Fase 4 — Compras + Inventarios (Semana 11-13)
```
□ Módulo compras (órdenes, envío, recepción)
□ Módulo inventarios (existencias, movimientos, centros de costo)
□ Frontend: Gestión de órdenes de compra
□ Frontend: Registro de recepciones
□ Frontend: Dashboard de inventario
□ Actualización automática de inventario por recepción
□ Tests de integración del ciclo completo
```

### Fase 5 — Reportes + KPIs (Semana 14-15)
```
□ Módulo reportes (ejecutivos, gerenciales)
□ KPIs de proveedores (cumplimiento, calidad, precio)
□ KPIs de procesos (tiempos, volúmenes, estados)
□ Frontend: Dashboard con gráficas (Recharts/Tremor)
□ Exportación PDF y Excel
□ Tests de generación de reportes
```

### Fase 6 — Pulido + Producción (Semana 16-17)
```
□ Evaluación de desempeño de proveedores
□ Gestión de novedades e incidencias
□ Optimización de queries (N+1, índices)
□ Revisión de seguridad (OWASP top 10)
□ Documentación API (Swagger completo)
□ Manual de usuario
□ Deploy a producción
□ Monitoreo y alertas
```

---

## 14. Decisiones Arquitectónicas (ADR)

### ADR-001: Monorepo con Turborepo
- **Estado:** Aceptada
- **Contexto:** Necesitamos compartir código entre frontend y backend.
- **Decisión:** Usar Turborepo + pnpm workspaces.
- **Consecuencias:** Build caching, código compartido, CI unificado. Requiere disciplina en boundaries de packages.

### ADR-002: Screaming Architecture
- **Estado:** Aceptada
- **Contexto:** El sistema tiene múltiples dominios de negocio claros.
- **Decisión:** Organizar por dominio de negocio, no por capa técnica.
- **Consecuencias:** Alta legibilidad, fácil onboarding, preparado para extracción a microservicios.

### ADR-003: Clean Architecture por Dominio
- **Estado:** Aceptada
- **Contexto:** Necesitamos testabilidad y desacoplamiento.
- **Decisión:** Cada dominio tiene capas domain/application/infrastructure/presentation.
- **Consecuencias:** Más archivos, pero cada pieza es testeable y reemplazable independientemente.

### ADR-004: Zod como Validación Compartida
- **Estado:** Aceptada
- **Contexto:** Validación duplicada entre front y back.
- **Decisión:** Schemas Zod en packages/shared, usados por ambas apps.
- **Consecuencias:** Single source of truth para validación. Inferencia de tipos automática.

### ADR-005: Domain Events para Comunicación entre Módulos
- **Estado:** Aceptada
- **Contexto:** Los módulos necesitan reaccionar a acciones de otros módulos.
- **Decisión:** EventBus in-memory (NestJS EventEmitter) con contratos tipados.
- **Consecuencias:** Desacoplamiento. Migración futura a message broker sin cambiar lógica de negocio.

### ADR-006: PostgreSQL como Base de Datos Principal
- **Estado:** Aceptada
- **Contexto:** Datos relacionales complejos, necesidad de ACID, JSON para metadata.
- **Decisión:** PostgreSQL 16 con Prisma como ORM.
- **Consecuencias:** Robustez, extensibilidad, soporte de JSON para campos flexibles.

### ADR-007: Redis para Cache y Sesiones
- **Estado:** Aceptada
- **Contexto:** Refresh tokens, cache de consultas frecuentes, pub/sub.
- **Decisión:** Redis 7 desde el inicio.
- **Consecuencias:** Performance, preparado para escalar. Requiere gestión de infraestructura adicional.

### ADR-008: BullMQ para Procesamiento Asíncrono
- **Estado:** Aceptada
- **Contexto:** Envío de emails, generación de reportes, tareas pesadas.
- **Decisión:** BullMQ sobre Redis para colas de trabajo.
- **Consecuencias:** No bloquear requests HTTP. Retry automático. Dashboard de monitoreo (Bull Board).

---

## 15. Riesgos y Mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|-------------|---------|------------|
| 1 | **Over-engineering** — Demasiada abstracción desde el inicio | Media | Alto | Implementar capas progresivamente. No crear abstracciones hasta que se necesiten 2+ implementaciones. |
| 2 | **Complejidad del monorepo** — Builds lentos, conflictos | Baja | Medio | Turborepo caching + CI incremental + boundaries claros entre packages. |
| 3 | **Flujos de aprobación complejos** — Reglas de negocio cambiantes | Alta | Alto | Motor de flujos parametrizable desde administración. No hardcodear reglas. |
| 4 | **Performance en reportes** — Queries pesadas sobre datos grandes | Media | Medio | Vistas materializadas en PostgreSQL + cache en Redis + generación async con BullMQ. |
| 5 | **Scope creep** — Agregar features no planificadas | Alta | Alto | Roadmap estricto por fases. Backlog priorizado. MVP primero. |
| 6 | **Seguridad** — Acceso no autorizado, inyección | Media | Crítico | OWASP checklist, validación Zod en todas las entradas, guards en todos los endpoints, audit log. |
| 7 | **Migración de datos** — Si hay sistema legacy | Media | Alto | Scripts de migración idempotentes. Período de coexistencia. |

---

## Apéndice A: Checklist Pre-Desarrollo

```
Infraestructura
  □ PostgreSQL 16 instalado/containerizado
  □ Redis 7 instalado/containerizado
  □ Node.js 20 LTS instalado
  □ pnpm instalado globalmente
  □ Docker + Docker Compose configurado
  □ Repositorio Git inicializado

Configuración
  □ .env.example con todas las variables
  □ Docker Compose funcional (pg + redis + api + web)
  □ ESLint + Prettier configurados
  □ Husky + lint-staged configurados
  □ tsconfig base + extendidos
  □ Turborepo configurado (turbo.json)

Primer Sprint
  □ Schema Prisma inicial (usuarios, roles, permisos)
  □ Seed de datos (admin, roles base)
  □ Endpoint de health check
  □ Login funcional (JWT)
  □ Dashboard con sidebar navegable
  □ CI pipeline: lint → test → build
```

---

> **Siguiente paso:** Inicializar el monorepo con la estructura definida en este documento (Fase 0).
