-- Script para asignar empresas de prueba a un usuario
-- Ejecutar este script para que el selector de empresas funcione

-- 1. Primero, verificar qué usuarios existen
SELECT id, email, nombre, apellido FROM usuarios;

-- 2. Verificar qué empresas existen
SELECT id, nombre, nit FROM empresas;

-- 3. Asignar empresas al usuario (reemplaza 'EMAIL_DEL_USUARIO' con el email real)
-- Ejemplo: Si tu usuario es admin@gestion-compras.com

-- Obtener el ID del usuario
DO $$
DECLARE
    v_usuario_id UUID;
    v_rol_admin_id UUID;
    v_empresa_ids UUID[];
BEGIN
    -- Buscar el usuario por email (CAMBIA ESTE EMAIL)
    SELECT id INTO v_usuario_id 
    FROM usuarios 
    WHERE email = 'admin@gestion-compras.com' 
    LIMIT 1;

    -- Buscar el rol de administrador
    SELECT id INTO v_rol_admin_id 
    FROM roles 
    WHERE codigo = 'super_admin' OR codigo = 'administrador' 
    LIMIT 1;

    -- Si no existe el usuario o el rol, mostrar error
    IF v_usuario_id IS NULL THEN
        RAISE EXCEPTION 'Usuario no encontrado. Verifica el email.';
    END IF;

    IF v_rol_admin_id IS NULL THEN
        RAISE EXCEPTION 'Rol de administrador no encontrado.';
    END IF;

    -- Obtener todas las empresas
    SELECT ARRAY_AGG(id) INTO v_empresa_ids FROM empresas WHERE activo = true;

    -- Asignar todas las empresas al usuario con rol de administrador
    IF v_empresa_ids IS NOT NULL THEN
        FOR i IN 1..array_length(v_empresa_ids, 1) LOOP
            INSERT INTO usuarios_empresas_roles (usuario_id, empresa_id, rol_id, activo)
            VALUES (v_usuario_id, v_empresa_ids[i], v_rol_admin_id, true)
            ON CONFLICT (usuario_id, empresa_id, rol_id) 
            DO UPDATE SET activo = true;
        END LOOP;

        RAISE NOTICE 'Se asignaron % empresas al usuario', array_length(v_empresa_ids, 1);
    ELSE
        RAISE NOTICE 'No hay empresas activas en el sistema';
    END IF;
END $$;

-- 4. Verificar las asignaciones
SELECT 
    u.email,
    u.nombre,
    e.nombre as empresa,
    r.nombre as rol
FROM usuarios_empresas_roles uer
JOIN usuarios u ON u.id = uer.usuario_id
JOIN empresas e ON e.id = uer.empresa_id
JOIN roles r ON r.id = uer.rol_id
WHERE uer.activo = true
ORDER BY u.email, e.nombre;

-- 5. Si no existen empresas, crear algunas de prueba
INSERT INTO empresas (nombre, nit, direccion, ciudad, telefono, email_corporativo, tipo_empresa, activo)
VALUES 
    ('AGM DESARROLLOS SAS', '900123456-1', 'Calle 100 #10-20', 'Cartagena', '3001234567', 'contacto@agm.com', 'sas', true),
    ('CONSORCIO AMERICAN LIGHTING', '900234567-2', 'Av. Principal #50-30', 'Cartagena', '3002345678', 'info@americanlighting.com', 'consorcio', true),
    ('REALTECH', '900345678-3', 'Carrera 5 #20-10', 'Cartagena', '3003456789', 'ventas@realtech.com', 'sas', true)
ON CONFLICT (nit) DO NOTHING;
