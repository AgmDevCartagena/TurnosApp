-- CreateEnum
CREATE TYPE "EstadoGeneral" AS ENUM ('activo', 'inactivo');
CREATE TYPE "EstadoEmpresa" AS ENUM ('activa', 'inactiva');
CREATE TYPE "RolUsuario" AS ENUM ('super_admin', 'admin', 'gestor_turnos', 'gestor_nomina', 'usuario', 'consulta');
CREATE TYPE "TipoModulo" AS ENUM ('turnos', 'nomina');
CREATE TYPE "TipoContrato" AS ENUM ('indefinido', 'fijo', 'obra_labor', 'aprendizaje', 'prestacion_servicios');
CREATE TYPE "TipoTurno" AS ENUM ('ADMINISTRATIVO', 'TURNO_100', 'TURNO_300', 'TURNO_400', 'TECNICO', 'CONDUCTOR', 'PERSONALIZADO', 'MANUAL');
CREATE TYPE "TipoValorParametro" AS ENUM ('porcentaje', 'valor_fijo', 'horas', 'dias');
CREATE TYPE "TipoConcepto" AS ENUM ('devengado', 'deduccion', 'prestacion', 'informativo');
CREATE TYPE "EstadoLiquidacion" AS ENUM ('borrador', 'aprobada', 'anulada');
CREATE TYPE "TipoNovedad" AS ENUM ('incapacidad', 'licencia_remunerada', 'licencia_no_remunerada', 'vacaciones', 'bonificacion', 'descuento', 'embargo', 'otro');
CREATE TYPE "EstadoNovedad" AS ENUM ('activa', 'aplicada', 'anulada');

-- CreateTable empresas
CREATE TABLE "empresas" (
    "id" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "nit" VARCHAR(30),
    "razonSocial" VARCHAR(200),
    "dominio" VARCHAR(100),
    "colorTema" VARCHAR(10) NOT NULL DEFAULT '#667eea',
    "logo" TEXT,
    "estado" "EstadoEmpresa" NOT NULL DEFAULT 'activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "empresas_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "empresas_nit_key" ON "empresas"("nit");
CREATE INDEX "empresas_estado_idx" ON "empresas"("estado");

-- CreateTable modulos
CREATE TABLE "modulos" (
    "id" TEXT NOT NULL,
    "codigo" "TipoModulo" NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "modulos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "modulos_codigo_key" ON "modulos"("codigo");

-- CreateTable empresa_modulos
CREATE TABLE "empresa_modulos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "moduloId" TEXT NOT NULL,
    "habilitado" BOOLEAN NOT NULL DEFAULT true,
    "fechaActivacion" TIMESTAMP(3),
    "fechaVencimiento" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "empresa_modulos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "empresa_modulos_empresaId_moduloId_key" UNIQUE ("empresaId", "moduloId")
);
CREATE INDEX "empresa_modulos_empresaId_habilitado_idx" ON "empresa_modulos"("empresaId", "habilitado");

-- CreateTable usuarios
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "username" VARCHAR(60) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "empresaId" TEXT,
    "rol" "RolUsuario" NOT NULL DEFAULT 'usuario',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "usuarios_username_key" ON "usuarios"("username");
CREATE INDEX "usuarios_empresaId_activo_idx" ON "usuarios"("empresaId", "activo");
CREATE INDEX "usuarios_rol_idx" ON "usuarios"("rol");

-- CreateTable usuario_modulos
CREATE TABLE "usuario_modulos" (
    "usuarioId" TEXT NOT NULL,
    "modulo" "TipoModulo" NOT NULL,
    CONSTRAINT "usuario_modulos_pkey" PRIMARY KEY ("usuarioId", "modulo")
);

-- CreateTable areas
CREATE TABLE "areas" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "codigo" VARCHAR(20),
    "descripcion" TEXT,
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "areas_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "areas_empresaId_nombre_key" UNIQUE ("empresaId", "nombre")
);
CREATE INDEX "areas_empresaId_estado_idx" ON "areas"("empresaId", "estado");

-- CreateTable usuario_areas
CREATE TABLE "usuario_areas" (
    "usuarioId" TEXT NOT NULL,
    "areaId" TEXT NOT NULL,
    CONSTRAINT "usuario_areas_pkey" PRIMARY KEY ("usuarioId", "areaId")
);
CREATE INDEX "usuario_areas_areaId_idx" ON "usuario_areas"("areaId");

-- CreateTable empleados
CREATE TABLE "empleados" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "areaId" TEXT,
    "documento" VARCHAR(20) NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellidos" VARCHAR(100),
    "cargo" VARCHAR(80),
    "salario" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tipoContrato" "TipoContrato" NOT NULL DEFAULT 'indefinido',
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "fechaIngreso" DATE,
    "fechaRetiro" DATE,
    "fechaCumpleanos" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "empleados_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "empleados_documento_empresaId_key" UNIQUE ("documento", "empresaId")
);
CREATE INDEX "empleados_empresaId_estado_idx" ON "empleados"("empresaId", "estado");
CREATE INDEX "empleados_empresaId_areaId_idx" ON "empleados"("empresaId", "areaId");

-- CreateTable turnos
CREATE TABLE "turnos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "areaId" TEXT,
    "turno" VARCHAR(60) NOT NULL,
    "tipoTurno" "TipoTurno",
    "tablaDescanso" VARCHAR(10),
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "horaInicio" VARCHAR(5),
    "horaFin" VARCHAR(5),
    "esTurnoPartido" BOOLEAN NOT NULL DEFAULT false,
    "horaInicio2" VARCHAR(5),
    "horaFin2" VARCHAR(5),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "cronogramaMongoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "turnos_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "turnos_empresaId_empleadoId_idx" ON "turnos"("empresaId", "empleadoId");
CREATE INDEX "turnos_empresaId_fechaInicio_fechaFin_idx" ON "turnos"("empresaId", "fechaInicio", "fechaFin");
CREATE INDEX "turnos_empresaId_areaId_fechaInicio_idx" ON "turnos"("empresaId", "areaId", "fechaInicio");

-- CreateTable parametros_nomina
CREATE TABLE "parametros_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "valor" DECIMAL(14,4) NOT NULL,
    "tipoValor" "TipoValorParametro" NOT NULL DEFAULT 'valor_fijo',
    "vigenciaDesde" DATE NOT NULL,
    "vigenciaHasta" DATE,
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "parametros_nomina_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "parametros_nomina_empresaId_codigo_vigenciaDesde_key" UNIQUE ("empresaId", "codigo", "vigenciaDesde")
);
CREATE INDEX "parametros_nomina_empresaId_codigo_estado_idx" ON "parametros_nomina"("empresaId", "codigo", "estado");

-- CreateTable conceptos_nomina
CREATE TABLE "conceptos_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "codigo" VARCHAR(60) NOT NULL,
    "nombre" VARCHAR(120) NOT NULL,
    "descripcion" TEXT,
    "tipo" "TipoConcepto" NOT NULL,
    "referenciaParametro" VARCHAR(60),
    "base" VARCHAR(60) NOT NULL DEFAULT 'salarioBase',
    "formula" TEXT,
    "afectaTotal" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "vigenciaDesde" DATE NOT NULL,
    "vigenciaHasta" DATE,
    "estado" "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conceptos_nomina_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "conceptos_nomina_empresaId_codigo_key" UNIQUE ("empresaId", "codigo")
);
CREATE INDEX "conceptos_nomina_empresaId_tipo_estado_idx" ON "conceptos_nomina"("empresaId", "tipo", "estado");

-- CreateTable liquidaciones_nomina
CREATE TABLE "liquidaciones_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "periodoInicio" DATE NOT NULL,
    "periodoFin" DATE NOT NULL,
    "salarioBase" DECIMAL(14,2) NOT NULL,
    "diasTrabajados" INTEGER NOT NULL DEFAULT 0,
    "totalDevengado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalDeducciones" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "netoPagar" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estado" "EstadoLiquidacion" NOT NULL DEFAULT 'borrador',
    "calculadoPorId" TEXT,
    "aprobadoPorId" TEXT,
    "fechaAprobacion" TIMESTAMP(3),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "liquidaciones_nomina_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "liquidaciones_nomina_unique" UNIQUE ("empresaId", "empleadoId", "periodoInicio", "periodoFin")
);
CREATE INDEX "liquidaciones_nomina_empresaId_estado_idx" ON "liquidaciones_nomina"("empresaId", "estado");
CREATE INDEX "liquidaciones_nomina_empresaId_periodo_idx" ON "liquidaciones_nomina"("empresaId", "periodoInicio", "periodoFin");

-- CreateTable detalle_liquidacion
CREATE TABLE "detalle_liquidacion" (
    "id" TEXT NOT NULL,
    "liquidacionId" TEXT NOT NULL,
    "conceptoId" TEXT,
    "codigoConcepto" VARCHAR(60) NOT NULL,
    "nombreConcepto" VARCHAR(120) NOT NULL,
    "tipo" "TipoConcepto" NOT NULL,
    "cantidad" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "base" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "porcentaje" DECIMAL(8,4) NOT NULL DEFAULT 0,
    "valor" DECIMAL(14,2) NOT NULL,
    "observacion" TEXT,
    CONSTRAINT "detalle_liquidacion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "detalle_liquidacion_liquidacionId_idx" ON "detalle_liquidacion"("liquidacionId");
CREATE INDEX "detalle_liquidacion_conceptoId_idx" ON "detalle_liquidacion"("conceptoId");

-- CreateTable novedades_nomina
CREATE TABLE "novedades_nomina" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "empleadoId" TEXT NOT NULL,
    "tipo" "TipoNovedad" NOT NULL,
    "descripcion" TEXT,
    "fechaInicio" DATE NOT NULL,
    "fechaFin" DATE NOT NULL,
    "cantidad" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "observacion" TEXT,
    "estado" "EstadoNovedad" NOT NULL DEFAULT 'activa',
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "novedades_nomina_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "novedades_nomina_empresaId_empleadoId_idx" ON "novedades_nomina"("empresaId", "empleadoId", "fechaInicio");
CREATE INDEX "novedades_nomina_tipo_estado_idx" ON "novedades_nomina"("empresaId", "tipo", "estado");

-- CreateTable festivos
CREATE TABLE "festivos" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "fecha" DATE NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "tipo" VARCHAR(30) NOT NULL DEFAULT 'nacional',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "festivos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "festivos_empresaId_fecha_key" UNIQUE ("empresaId", "fecha")
);
CREATE INDEX "festivos_fecha_idx" ON "festivos"("fecha");

-- AddForeignKey
ALTER TABLE "empresa_modulos" ADD CONSTRAINT "empresa_modulos_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "empresa_modulos" ADD CONSTRAINT "empresa_modulos_moduloId_fkey"
    FOREIGN KEY ("moduloId") REFERENCES "modulos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "usuario_modulos" ADD CONSTRAINT "usuario_modulos_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "areas" ADD CONSTRAINT "areas_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario_areas" ADD CONSTRAINT "usuario_areas_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "usuario_areas" ADD CONSTRAINT "usuario_areas_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "empleados" ADD CONSTRAINT "empleados_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "empleados" ADD CONSTRAINT "empleados_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "turnos" ADD CONSTRAINT "turnos_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_empleadoId_fkey"
    FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "turnos" ADD CONSTRAINT "turnos_areaId_fkey"
    FOREIGN KEY ("areaId") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "parametros_nomina" ADD CONSTRAINT "parametros_nomina_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "conceptos_nomina" ADD CONSTRAINT "conceptos_nomina_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "liquidaciones_nomina" ADD CONSTRAINT "liquidaciones_nomina_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidaciones_nomina" ADD CONSTRAINT "liquidaciones_nomina_empleadoId_fkey"
    FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "liquidaciones_nomina" ADD CONSTRAINT "liquidaciones_nomina_calculadoPorId_fkey"
    FOREIGN KEY ("calculadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "liquidaciones_nomina" ADD CONSTRAINT "liquidaciones_nomina_aprobadoPorId_fkey"
    FOREIGN KEY ("aprobadoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "detalle_liquidacion" ADD CONSTRAINT "detalle_liquidacion_liquidacionId_fkey"
    FOREIGN KEY ("liquidacionId") REFERENCES "liquidaciones_nomina"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "detalle_liquidacion" ADD CONSTRAINT "detalle_liquidacion_conceptoId_fkey"
    FOREIGN KEY ("conceptoId") REFERENCES "conceptos_nomina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "novedades_nomina" ADD CONSTRAINT "novedades_nomina_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "novedades_nomina" ADD CONSTRAINT "novedades_nomina_empleadoId_fkey"
    FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "novedades_nomina" ADD CONSTRAINT "novedades_nomina_registradoPorId_fkey"
    FOREIGN KEY ("registradoPorId") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "festivos" ADD CONSTRAINT "festivos_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
