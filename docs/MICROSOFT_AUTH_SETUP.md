# Configuración de Autenticación Microsoft 365 / Entra ID

## Resumen

Este documento describe la configuración completa del módulo de autenticación corporativa con Microsoft 365 / Entra ID para la Plataforma Control de Compras AGM.

## Arquitectura Implementada

**Flujo:** Authorization Code Flow con PKCE + Backend Session Management

- **Frontend:** MSAL.js para iniciar flujo OAuth2/OIDC
- **Backend:** Validación de tokens + Emisión de sesión propia
- **Sesiones:** Cookies httpOnly + Redis
- **MFA/2FA:** Delegado completamente a Microsoft Entra ID

## Requisitos Previos

### 1. Registro de Aplicación en Azure AD

1. Acceder a [Azure Portal](https://portal.azure.com)
2. Ir a **Azure Active Directory** → **App registrations** → **New registration**
3. Configurar:
   - **Name:** Plataforma Control de Compras AGM
   - **Supported account types:** Accounts in this organizational directory only (Single tenant)
   - **Redirect URI:** 
     - Type: Single-page application (SPA)
     - URI: `http://localhost:3000` (desarrollo) / `https://tudominio.com` (producción)

4. Anotar:
   - **Application (client) ID**
   - **Directory (tenant) ID**

5. En **Certificates & secrets**:
   - Crear un **New client secret**
   - Anotar el **Value** (solo se muestra una vez)

6. En **API permissions**:
   - Agregar permisos delegados:
     - `openid`
     - `profile`
     - `email`
     - `User.Read`
   - Hacer clic en **Grant admin consent**

7. En **Authentication**:
   - Habilitar **Access tokens** y **ID tokens**
   - Configurar **Logout URL**: `http://localhost:3000` o tu dominio

### 2. Configurar Dominios Permitidos

Definir qué dominios corporativos pueden acceder (ej: `@tuempresa.com`).

## Variables de Entorno

### Backend (`apps/api/.env`)

```bash
# Microsoft Entra ID / Azure AD
MICROSOFT_TENANT_ID=tu-tenant-id-aqui
MICROSOFT_CLIENT_ID=tu-client-id-aqui
MICROSOFT_CLIENT_SECRET=tu-client-secret-aqui
MICROSOFT_REDIRECT_URI=http://localhost:3000

# Dominios corporativos permitidos (separados por coma)
MICROSOFT_ALLOWED_DOMAINS=tuempresa.com,subsidiaria.com

# Auto-aprovisionamiento de usuarios nuevos
MICROSOFT_AUTO_PROVISION=true

# Rol por defecto para usuarios auto-aprovisionados
MICROSOFT_DEFAULT_ROLE=solicitante

# Redis para sesiones
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_SESSION_DB=1

# Configuración de sesión
SESSION_TTL=86400
SESSION_COOKIE_NAME=session_id
```

### Frontend (`apps/web/.env.local`)

```bash
# Microsoft Entra ID
NEXT_PUBLIC_MICROSOFT_CLIENT_ID=tu-client-id-aqui
NEXT_PUBLIC_MICROSOFT_TENANT_ID=tu-tenant-id-aqui
NEXT_PUBLIC_MICROSOFT_REDIRECT_URI=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API Backend
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

## Instalación de Dependencias

### Backend

```bash
cd apps/api
pnpm add jsonwebtoken jwks-rsa uuid
pnpm add -D @types/jsonwebtoken @types/uuid
```

### Frontend

```bash
cd apps/web
pnpm add @azure/msal-browser @azure/msal-react
```

## Migración de Base de Datos

```bash
# Generar cliente Prisma con nuevos modelos
pnpm db:generate

# Aplicar migración
pnpm db:migrate

# O ejecutar directamente el SQL
psql -U postgres -d gestion_compras -f apps/api/src/database/prisma/migrations/add_microsoft_auth/migration.sql
```

## Configuración del Backend

### Registrar configuraciones en `app.module.ts`

```typescript
import microsoftConfig from './config/microsoft.config';
import redisConfig from './config/redis.config';
import sessionConfig from './config/session.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        // ... otras configs
        microsoftConfig,
        redisConfig,
        sessionConfig,
      ],
    }),
    // ... otros módulos
  ],
})
export class AppModule {}
```

### Habilitar cookies en `main.ts`

```typescript
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser());
  
  app.enableCors({
    origin: process.env.API_CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });
  
  // ... resto de configuración
}
```

## Flujo de Autenticación

### 1. Usuario accede a `/login`

- Ve botón "Continuar con Microsoft 365"
- Click inicia popup de Microsoft

### 2. Autenticación en Microsoft

- Usuario ingresa credenciales corporativas
- Microsoft valida y aplica MFA si está configurado
- Retorna `id_token` y `access_token`

### 3. Callback al Backend

```
POST /api/v1/auth/microsoft/callback
{
  "idToken": "eyJ...",
  "accessToken": "eyJ..."
}
```

### 4. Backend valida y crea sesión

- Valida `id_token` con claves públicas de Microsoft
- Verifica issuer, audience, tenant, expiración
- Valida dominio corporativo
- Busca o crea usuario local
- Crea sesión en Redis
- Emite cookie httpOnly

### 5. Usuario autenticado

- Cookie se envía automáticamente en requests
- Backend valida sesión con `SessionAuthGuard`
- Autorización de negocio aplicada

## Endpoints Implementados

### `POST /api/v1/auth/microsoft/callback`
Callback de autenticación Microsoft

**Body:**
```json
{
  "idToken": "string",
  "accessToken": "string"
}
```

**Response:**
```json
{
  "usuario": {
    "id": "uuid",
    "email": "usuario@empresa.com",
    "nombre": "Juan",
    "apellido": "Pérez",
    "rol": {
      "id": "uuid",
      "nombre": "solicitante"
    },
    "permisos": ["solicitudes:crear", "solicitudes:leer"]
  },
  "isNewUser": false
}
```

### `GET /api/v1/auth/me`
Obtener usuario actual por sesión

**Headers:** Cookie con `session_id`

**Response:**
```json
{
  "id": "uuid",
  "email": "usuario@empresa.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "rol": { "id": "uuid", "nombre": "solicitante" },
  "permisos": ["solicitudes:crear"]
}
```

### `POST /api/v1/auth/logout`
Cerrar sesión

**Response:**
```json
{
  "message": "Sesión cerrada exitosamente"
}
```

## Casos de Prueba

### ✅ Usuario corporativo válido con MFA exitoso

1. Acceder a `http://localhost:3000/login`
2. Click en "Continuar con Microsoft 365"
3. Ingresar credenciales corporativas
4. Completar MFA si aplica
5. Verificar redirección a `/dashboard`
6. Verificar cookie `session_id` en DevTools

### ✅ Usuario autenticado pero no autorizado localmente

**Configurar:** `MICROSOFT_AUTO_PROVISION=false`

1. Intentar login con cuenta corporativa válida no registrada
2. Verificar mensaje: "Tu cuenta no está autorizada para acceder a esta plataforma"
3. Verificar evento en `auth_audit_logs` con `exitoso=false`

### ✅ Correo fuera del dominio permitido

**Configurar:** `MICROSOFT_ALLOWED_DOMAINS=tuempresa.com`

1. Intentar login con cuenta `@otrodominio.com`
2. Verificar mensaje: "Tu cuenta corporativa no tiene acceso a esta plataforma"
3. Verificar evento `microsoft_login_domain_denied` en auditoría

### ✅ Sesión expirada

1. Iniciar sesión exitosamente
2. Esperar expiración de sesión (o eliminar de Redis manualmente)
3. Intentar acceder a ruta protegida
4. Verificar redirección a `/login`
5. Verificar mensaje: "Sesión expirada o inválida"

### ✅ Logout correcto

1. Iniciar sesión
2. Click en botón de logout
3. Verificar eliminación de cookie
4. Verificar eliminación de sesión en Redis
5. Verificar redirección a `/login`

### ✅ Recarga de página con sesión vigente

1. Iniciar sesión
2. Recargar página (F5)
3. Verificar que permanece autenticado
4. Verificar llamada a `/auth/me` exitosa

### ✅ Acceso a ruta protegida sin sesión

1. Sin autenticar, intentar acceder a `/dashboard`
2. Verificar redirección a `/login`

### ✅ Usuario existente con roles cargados

1. Crear usuario manualmente en BD con rol específico
2. Iniciar sesión con Microsoft
3. Verificar que se cargan roles y permisos correctos
4. Verificar `isNewUser: false` en response

### ✅ Usuario nuevo según política definida

**Configurar:** `MICROSOFT_AUTO_PROVISION=true`

1. Iniciar sesión con cuenta corporativa nueva
2. Verificar creación automática en BD
3. Verificar asignación de rol por defecto
4. Verificar `isNewUser: true` en response
5. Verificar evento `microsoft_login_success` con metadata

## Auditoría de Eventos

Todos los eventos de autenticación se registran en `auth_audit_logs`:

```sql
SELECT 
  evento,
  email,
  auth_provider,
  exitoso,
  razon,
  created_at
FROM auth_audit_logs
ORDER BY created_at DESC
LIMIT 50;
```

**Eventos registrados:**
- `microsoft_login_success`
- `microsoft_login_failed`
- `microsoft_login_domain_denied`
- `microsoft_login_user_not_authorized`
- `microsoft_login_user_inactive`

## Seguridad

### Implementado

✅ Validación de tokens con claves públicas de Microsoft  
✅ Verificación de issuer, audience, tenant  
✅ Cookies httpOnly + sameSite  
✅ Sesiones en Redis con TTL  
✅ Validación de dominios corporativos  
✅ Auditoría completa de eventos  
✅ Rate limiting en endpoints de auth (via Throttler)  
✅ No exponer secretos en logs  

### Recomendaciones para Producción

- [ ] Habilitar HTTPS (cookies con `secure: true`)
- [ ] Configurar CORS estricto
- [ ] Implementar CSRF tokens si aplica
- [ ] Configurar rate limiting agresivo
- [ ] Monitorear eventos de auditoría
- [ ] Implementar alertas de intentos fallidos
- [ ] Rotar client secrets periódicamente
- [ ] Configurar políticas de acceso condicional en Azure AD
- [ ] Habilitar logging estructurado
- [ ] Implementar renovación automática de sesión

## Troubleshooting

### Error: "Token de Microsoft inválido o expirado"

- Verificar que `MICROSOFT_TENANT_ID` y `MICROSOFT_CLIENT_ID` sean correctos
- Verificar conectividad con `login.microsoftonline.com`
- Revisar logs del backend para detalles

### Error: "Dominio no permitido"

- Verificar `MICROSOFT_ALLOWED_DOMAINS` en `.env`
- Formato: `dominio1.com,dominio2.com` (sin espacios, sin @)

### Error: "Popup bloqueado"

- Permitir popups para el sitio
- Alternativamente, usar redirect flow en lugar de popup

### Sesión no persiste

- Verificar que Redis esté corriendo
- Verificar `REDIS_HOST` y `REDIS_PORT`
- Verificar que cookies estén habilitadas en el navegador

### Usuario no se auto-aprovisiona

- Verificar `MICROSOFT_AUTO_PROVISION=true`
- Verificar que exista el rol configurado en `MICROSOFT_DEFAULT_ROLE`
- Revisar logs de backend

## Próximos Pasos

1. **Testing E2E:** Implementar tests con Playwright
2. **Renovación de sesión:** Implementar refresh automático
3. **Logout en todos los dispositivos:** Implementar endpoint
4. **Notificaciones:** Alertar login desde nueva ubicación
5. **Dashboard de auditoría:** Panel para revisar eventos de auth
6. **Integración con Graph API:** Obtener foto de perfil, etc.

## Soporte

Para dudas o problemas, contactar al equipo de arquitectura.
