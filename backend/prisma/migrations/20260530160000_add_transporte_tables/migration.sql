-- Migration: add_transporte_tables
-- Agrega módulo de Transporte y Programación Operativa

-- 1. Nuevos valores al enum TipoModulo
ALTER TYPE "TipoModulo" ADD VALUE IF NOT EXISTS 'transporte';
ALTER TYPE "TipoModulo" ADD VALUE IF NOT EXISTS 'programacion_operativa';

-- 2. Nuevos enums del módulo
CREATE TYPE "EstadoProgramacionOp" AS ENUM ('borrador', 'validada', 'aprobada', 'enviada', 'cerrada', 'anulada');
CREATE TYPE "TipoMovimientoTransporte" AS ENUM ('recogida', 'salida', 'retorno');
CREATE TYPE "TipoServicioAlimentacion" AS ENUM ('merienda', 'cena', 'merienda_nocturna', 'otro');
CREATE TYPE "EstadoServicioAlimentacion" AS ENUM ('pendiente', 'asignado', 'recibido', 'entregado', 'con_novedad', 'cancelado');
CREATE TYPE "TipoProgramacionPersona" AS ENUM ('normal', 'extendido', 'turno_b', 'otro');
CREATE TYPE "TipoNovedadOperativa" AS ENUM ('persona_no_asistio', 'cambio_responsable', 'merienda_no_recibida', 'cena_incompleta', 'cambio_turno', 'persona_adicional', 'error_listado', 'cambio_ruta', 'cambio_conductor', 'otra');

-- 3. Tabla config_turnos_op
CREATE TABLE "config_turnos_op" (
    "id"                  TEXT NOT NULL,
    "empresaId"           TEXT NOT NULL,
    "codigo"              VARCHAR(40) NOT NULL,
    "nombreTurno"         VARCHAR(80) NOT NULL,
    "horaInicio"          VARCHAR(5) NOT NULL,
    "horaFin"             VARCHAR(5) NOT NULL,
    "horaExtensionInicio" VARCHAR(5),
    "horaExtensionFin"    VARCHAR(5),
    "generaMerienda"      BOOLEAN NOT NULL DEFAULT false,
    "generaCena"          BOOLEAN NOT NULL DEFAULT false,
    "requiereResponsable" BOOLEAN NOT NULL DEFAULT false,
    "esExtendido"         BOOLEAN NOT NULL DEFAULT false,
    "esTurnoNocturno"     BOOLEAN NOT NULL DEFAULT false,
    "activo"              BOOLEAN NOT NULL DEFAULT true,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "config_turnos_op_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "config_turnos_op_empresaId_codigo_key" ON "config_turnos_op"("empresaId", "codigo");
CREATE INDEX "config_turnos_op_empresaId_activo_idx" ON "config_turnos_op"("empresaId", "activo");
ALTER TABLE "config_turnos_op" ADD CONSTRAINT "config_turnos_op_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 4. Tabla conductores_transporte
CREATE TABLE "conductores_transporte" (
    "id"        TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "nombre"    VARCHAR(150) NOT NULL,
    "documento" VARCHAR(20),
    "telefono"  VARCHAR(20),
    "estado"    "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "conductores_transporte_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "conductores_transporte_empresaId_estado_idx" ON "conductores_transporte"("empresaId", "estado");
ALTER TABLE "conductores_transporte" ADD CONSTRAINT "conductores_transporte_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Tabla vehiculos_transporte
CREATE TABLE "vehiculos_transporte" (
    "id"          TEXT NOT NULL,
    "empresaId"   TEXT NOT NULL,
    "placa"       VARCHAR(10) NOT NULL,
    "descripcion" VARCHAR(100),
    "capacidad"   INTEGER,
    "estado"      "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehiculos_transporte_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vehiculos_transporte_empresaId_placa_key" ON "vehiculos_transporte"("empresaId", "placa");
CREATE INDEX "vehiculos_transporte_empresaId_estado_idx" ON "vehiculos_transporte"("empresaId", "estado");
ALTER TABLE "vehiculos_transporte" ADD CONSTRAINT "vehiculos_transporte_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 6. Tabla ubicaciones_ruta
CREATE TABLE "ubicaciones_ruta" (
    "id"          TEXT NOT NULL,
    "empresaId"   TEXT NOT NULL,
    "nombre"      VARCHAR(100) NOT NULL,
    "descripcion" TEXT,
    "estado"      "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ubicaciones_ruta_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ubicaciones_ruta_empresaId_nombre_key" ON "ubicaciones_ruta"("empresaId", "nombre");
CREATE INDEX "ubicaciones_ruta_empresaId_estado_idx" ON "ubicaciones_ruta"("empresaId", "estado");
ALTER TABLE "ubicaciones_ruta" ADD CONSTRAINT "ubicaciones_ruta_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 7. Tabla programaciones_transporte
CREATE TABLE "programaciones_transporte" (
    "id"              TEXT NOT NULL,
    "empresaId"       TEXT NOT NULL,
    "fecha"           DATE NOT NULL,
    "horaSalida"      VARCHAR(5) NOT NULL,
    "tipoMovimiento"  "TipoMovimientoTransporte" NOT NULL DEFAULT 'salida',
    "titulo"          VARCHAR(200),
    "conductorId"     TEXT,
    "vehiculoId"      TEXT,
    "placaManual"     VARCHAR(10),
    "conductorManual" VARCHAR(100),
    "estado"          "EstadoProgramacionOp" NOT NULL DEFAULT 'borrador',
    "observaciones"   TEXT,
    "creadoPorId"     TEXT,
    "revisadoPorId"   TEXT,
    "aprobadoPorId"   TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "programaciones_transporte_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "programaciones_transporte_empresaId_fecha_idx" ON "programaciones_transporte"("empresaId", "fecha");
CREATE INDEX "programaciones_transporte_empresaId_estado_idx" ON "programaciones_transporte"("empresaId", "estado");
ALTER TABLE "programaciones_transporte" ADD CONSTRAINT "programaciones_transporte_empresaId_fkey"
    FOREIGN KEY ("empresaId") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "programaciones_transporte" ADD CONSTRAINT "programaciones_transporte_conductorId_fkey"
    FOREIGN KEY ("conductorId") REFERENCES "conductores_transporte"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "programaciones_transporte" ADD CONSTRAINT "programaciones_transporte_vehiculoId_fkey"
    FOREIGN KEY ("vehiculoId") REFERENCES "vehiculos_transporte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 8. Tabla detalles_program_transporte
CREATE TABLE "detalles_program_transporte" (
    "id"                       TEXT NOT NULL,
    "programacionId"           TEXT NOT NULL,
    "empresaId"                TEXT NOT NULL,
    "empleadoId"               TEXT,
    "nombreEmpleado"           VARCHAR(150) NOT NULL,
    "documentoEmpleado"        VARCHAR(20),
    "areaNombre"               VARCHAR(100),
    "coordinadorNombre"        VARCHAR(150),
    "cargo"                    VARCHAR(80),
    "fecha"                    DATE NOT NULL,
    "horaInicio"               VARCHAR(5) NOT NULL,
    "horaFin"                  VARCHAR(5) NOT NULL,
    "tipoProgramacion"         "TipoProgramacionPersona" NOT NULL DEFAULT 'normal',
    "requiereMerienda"         BOOLEAN NOT NULL DEFAULT false,
    "requiereCena"             BOOLEAN NOT NULL DEFAULT false,
    "requiereRuta"             BOOLEAN NOT NULL DEFAULT true,
    "ubicacionId"              TEXT,
    "ubicacionTexto"           VARCHAR(150),
    "esResponsableAlimentacion" BOOLEAN NOT NULL DEFAULT false,
    "tipoResponsabilidad"      VARCHAR(30),
    "orden"                    INTEGER NOT NULL DEFAULT 0,
    "observacion"              TEXT,
    "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                TIMESTAMP(3) NOT NULL,
    CONSTRAINT "detalles_program_transporte_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "detalles_program_transporte_programacionId_nombreEmpleado_fec_key"
    ON "detalles_program_transporte"("programacionId", "nombreEmpleado", "fecha", "horaInicio");
CREATE INDEX "detalles_program_transporte_programacionId_idx" ON "detalles_program_transporte"("programacionId");
CREATE INDEX "detalles_program_transporte_empleadoId_idx" ON "detalles_program_transporte"("empleadoId");
ALTER TABLE "detalles_program_transporte" ADD CONSTRAINT "detalles_program_transporte_programacionId_fkey"
    FOREIGN KEY ("programacionId") REFERENCES "programaciones_transporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "detalles_program_transporte" ADD CONSTRAINT "detalles_program_transporte_empleadoId_fkey"
    FOREIGN KEY ("empleadoId") REFERENCES "empleados"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "detalles_program_transporte" ADD CONSTRAINT "detalles_program_transporte_ubicacionId_fkey"
    FOREIGN KEY ("ubicacionId") REFERENCES "ubicaciones_ruta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 9. Tabla servicios_alimentacion
CREATE TABLE "servicios_alimentacion" (
    "id"                TEXT NOT NULL,
    "programacionId"    TEXT NOT NULL,
    "empresaId"         TEXT NOT NULL,
    "fecha"             DATE NOT NULL,
    "tipoServicio"      "TipoServicioAlimentacion" NOT NULL,
    "areaNombre"        VARCHAR(100),
    "responsableNombre" VARCHAR(150),
    "responsableDoc"    VARCHAR(20),
    "cantidadPersonas"  INTEGER NOT NULL DEFAULT 0,
    "estado"            "EstadoServicioAlimentacion" NOT NULL DEFAULT 'pendiente',
    "observacion"       TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "servicios_alimentacion_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "servicios_alimentacion_programacionId_idx" ON "servicios_alimentacion"("programacionId");
CREATE INDEX "servicios_alimentacion_empresaId_fecha_idx" ON "servicios_alimentacion"("empresaId", "fecha");
ALTER TABLE "servicios_alimentacion" ADD CONSTRAINT "servicios_alimentacion_programacionId_fkey"
    FOREIGN KEY ("programacionId") REFERENCES "programaciones_transporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 10. Tabla novedades_operativas
CREATE TABLE "novedades_operativas" (
    "id"              TEXT NOT NULL,
    "programacionId"  TEXT NOT NULL,
    "empresaId"       TEXT NOT NULL,
    "fecha"           DATE NOT NULL,
    "tipoNovedad"     "TipoNovedadOperativa" NOT NULL,
    "descripcion"     TEXT NOT NULL,
    "empleadoNombre"  VARCHAR(150),
    "areaNombre"      VARCHAR(100),
    "registradoPorId" TEXT,
    "estado"          "EstadoGeneral" NOT NULL DEFAULT 'activo',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "novedades_operativas_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "novedades_operativas_programacionId_idx" ON "novedades_operativas"("programacionId");
CREATE INDEX "novedades_operativas_empresaId_fecha_idx" ON "novedades_operativas"("empresaId", "fecha");
ALTER TABLE "novedades_operativas" ADD CONSTRAINT "novedades_operativas_programacionId_fkey"
    FOREIGN KEY ("programacionId") REFERENCES "programaciones_transporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;
