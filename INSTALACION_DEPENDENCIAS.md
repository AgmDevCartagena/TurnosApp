# Instalación de Dependencias - Autenticación Microsoft

## Backend (apps/api)

Ejecutar desde la raíz del proyecto:

```bash
cd apps/api

# Dependencias de producción
pnpm add jsonwebtoken@^9.0.2
pnpm add jwks-rsa@^3.1.0
pnpm add uuid@^9.0.1

# Dependencias de desarrollo (tipos TypeScript)
pnpm add -D @types/jsonwebtoken@^9.0.5
pnpm add -D @types/uuid@^9.0.7
```

### Verificación

```bash
# Verificar que se instalaron correctamente
pnpm list jsonwebtoken jwks-rsa uuid
```

## Frontend (apps/web)

Ejecutar desde la raíz del proyecto:

```bash
cd apps/web

# Dependencias de MSAL para autenticación Microsoft
pnpm add @azure/msal-browser@^3.7.1
pnpm add @azure/msal-react@^2.0.11
```

### Verificación

```bash
# Verificar que se instalaron correctamente
pnpm list @azure/msal-browser @azure/msal-react
```

## Regenerar Cliente Prisma

Después de modificar el schema de Prisma, regenerar el cliente:

```bash
# Desde la raíz del proyecto
pnpm db:generate
```

## Aplicar Migraciones

```bash
# Desde la raíz del proyecto
pnpm db:migrate
```

## Instalación Completa (Script Rápido)

Ejecutar desde la raíz del monorepo:

```bash
# Backend
cd apps/api && \
pnpm add jsonwebtoken jwks-rsa uuid && \
pnpm add -D @types/jsonwebtoken @types/uuid && \
cd ../..

# Frontend
cd apps/web && \
pnpm add @azure/msal-browser @azure/msal-react && \
cd ../..

# Regenerar Prisma
pnpm db:generate

# Aplicar migraciones
pnpm db:migrate

echo "✅ Dependencias instaladas correctamente"
```

## Verificación Final

```bash
# Verificar que todo compile sin errores
pnpm build
```

## Notas

- Todas las dependencias son compatibles con Node.js 20 LTS
- Las versiones especificadas son las recomendadas y probadas
- Si hay conflictos de versiones, revisar `package.json` de cada app
