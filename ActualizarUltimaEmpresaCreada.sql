BEGIN;

-- =========================================================
-- BLOQUEO TRANSACCIONAL DE SEGURIDAD
-- =========================================================
SELECT pg_advisory_xact_lock(20260411);

DO $$
DECLARE
    -- =====================================================
    -- CONFIGURACIÓN
    -- =====================================================
    -- Empresa plantilla desde donde se copiarán los roles default
    v_roles_template_empresa_id bigint := 1;

    -- Datos del área base
    v_area_general_nombre varchar := 'Area General';
    v_area_general_codigo varchar := 'DEF';
    v_area_general_descripcion text := 'Área general creada automáticamente para completar la configuración inicial de la empresa.';

    -- =====================================================
    -- VARIABLES INTERNAS
    -- =====================================================
    v_empresa_id integer;
    v_schema_name varchar;
    v_schema_param_key varchar;
    v_area_general_id integer;
    v_area_link_exists boolean := false;
    v_roles_template_count integer := 0;
    v_roles_empresa_count integer := 0;
    v_new_role_id bigint;
    v_has_role_permissions boolean := false;

    r_role_template record;
BEGIN
    -- =====================================================
    -- NORMALIZACIÓN BÁSICA
    -- =====================================================
    v_area_general_nombre := btrim(v_area_general_nombre);
    v_area_general_codigo := NULLIF(btrim(v_area_general_codigo), '');
    v_area_general_descripcion := NULLIF(btrim(v_area_general_descripcion), '');

    IF v_area_general_nombre IS NULL OR v_area_general_nombre = '' THEN
        RAISE EXCEPTION 'El nombre del área general es obligatorio.';
    END IF;

    -- =====================================================
    -- OBTENER LA ÚLTIMA EMPRESA CREADA
    -- =====================================================
    SELECT MAX(id)
    INTO v_empresa_id
    FROM public.ref_empresa;

    IF v_empresa_id IS NULL THEN
        RAISE EXCEPTION 'No existen empresas en public.ref_empresa.';
    END IF;

    -- =====================================================
    -- RESOLVER EL NOMBRE DEL SCHEMA
    -- Primero intenta leerlo desde ref_parametros
    -- Si no existe, usa empresa_{id}
    -- =====================================================
    v_schema_param_key := 'esquema_' || v_empresa_id;

    SELECT value
    INTO v_schema_name
    FROM public.ref_parametros
    WHERE "key" = v_schema_param_key
    ORDER BY id_parametro DESC
    LIMIT 1;

    IF v_schema_name IS NULL OR btrim(v_schema_name) = '' THEN
        v_schema_name := 'empresa_' || v_empresa_id;
    END IF;

    -- =====================================================
    -- VALIDACIONES PREVIAS
    -- =====================================================
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.schemata
        WHERE schema_name = v_schema_name
    ) THEN
        RAISE EXCEPTION 'No existe el schema "%" para la empresa ID %.', v_schema_name, v_empresa_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = v_schema_name
          AND table_name = 'area'
    ) THEN
        RAISE EXCEPTION 'No existe la tabla %.area.', v_schema_name;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = v_schema_name
          AND table_name = 'area_ref_empresa'
    ) THEN
        RAISE EXCEPTION 'No existe la tabla %.area_ref_empresa.', v_schema_name;
    END IF;

    SELECT COUNT(*)
    INTO v_roles_template_count
    FROM public.roles
    WHERE ref_empresa_id = v_roles_template_empresa_id;

    IF v_roles_template_count <= 0 THEN
        RAISE EXCEPTION 'No existen roles plantilla en public.roles para ref_empresa_id = %.', v_roles_template_empresa_id;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'role_has_permissions'
    )
    INTO v_has_role_permissions;

    -- =====================================================
    -- ASEGURAR PARÁMETRO esquema_{id}
    -- =====================================================
    IF NOT EXISTS (
        SELECT 1
        FROM public.ref_parametros
        WHERE "key" = v_schema_param_key
    ) THEN
        INSERT INTO public.ref_parametros (
            descripcion,
            "key",
            value,
            estado,
            created,
            updated
        )
        VALUES (
            'Esquema (tenant) para la empresa ID ' || v_empresa_id,
            v_schema_param_key,
            v_schema_name,
            true,
            NOW(),
            NOW()
        );
    END IF;

    -- =====================================================
    -- BUSCAR O CREAR ÁREA GENERAL
    -- =====================================================
    EXECUTE format(
        'SELECT id
           FROM %I.area
          WHERE upper(coalesce(codigo, '''')) = upper($1)
             OR upper(nombre) = upper($2)
          ORDER BY CASE
                     WHEN upper(coalesce(codigo, '''')) = upper($1) THEN 0
                     ELSE 1
                   END,
                   id
          LIMIT 1',
        v_schema_name
    )
    INTO v_area_general_id
    USING v_area_general_codigo, v_area_general_nombre;

    IF v_area_general_id IS NULL THEN
        EXECUTE format(
            'INSERT INTO %I.area (
                nombre,
                codigo,
                descripcion,
                estado,
                created_at,
                updated_at
            ) VALUES ($1, $2, $3, true, NOW(), NOW())
            RETURNING id',
            v_schema_name
        )
        INTO v_area_general_id
        USING v_area_general_nombre, v_area_general_codigo, v_area_general_descripcion;
    END IF;

    IF v_area_general_id IS NULL THEN
        RAISE EXCEPTION 'No fue posible crear o localizar el área general en el schema %.', v_schema_name;
    END IF;

    -- =====================================================
    -- ASEGURAR VÍNCULO EN area_ref_empresa
    -- =====================================================
    EXECUTE format(
        'SELECT EXISTS (
            SELECT 1
            FROM %I.area_ref_empresa
            WHERE ref_empresa_id = $1
              AND area_id = $2
        )',
        v_schema_name
    )
    INTO v_area_link_exists
    USING v_empresa_id, v_area_general_id;

    IF NOT v_area_link_exists THEN
        EXECUTE format(
            'INSERT INTO %I.area_ref_empresa (
                ref_empresa_id,
                area_id,
                created_at,
                updated_at
            ) VALUES ($1, $2, NOW(), NOW())',
            v_schema_name
        )
        USING v_empresa_id, v_area_general_id;
    END IF;

    -- =====================================================
    -- ASEGURAR ROLES DEFAULT EN public.roles
    -- Copia todos los roles de la empresa plantilla
    -- =====================================================
    FOR r_role_template IN
        SELECT id, name, guard_name
        FROM public.roles
        WHERE ref_empresa_id = v_roles_template_empresa_id
        ORDER BY id
    LOOP
        v_new_role_id := NULL;

        INSERT INTO public.roles (
            name,
            guard_name,
            created_at,
            updated_at,
            ref_empresa_id
        )
        VALUES (
            r_role_template.name,
            r_role_template.guard_name,
            NOW(),
            NOW(),
            v_empresa_id
        )
        ON CONFLICT (ref_empresa_id, name, guard_name) DO NOTHING
        RETURNING id INTO v_new_role_id;

        IF v_new_role_id IS NULL THEN
            SELECT id
            INTO v_new_role_id
            FROM public.roles
            WHERE ref_empresa_id = v_empresa_id
              AND name = r_role_template.name
              AND guard_name = r_role_template.guard_name
            LIMIT 1;
        END IF;

        IF v_new_role_id IS NULL THEN
            RAISE EXCEPTION 'No fue posible crear o localizar el rol "%" para la empresa ID %.',
                r_role_template.name, v_empresa_id;
        END IF;

        -- =================================================
        -- COPIAR PERMISOS DEL ROL SI EXISTE role_has_permissions
        -- =================================================
        IF v_has_role_permissions THEN
            INSERT INTO public.role_has_permissions (permission_id, role_id)
            SELECT rhp.permission_id, v_new_role_id
            FROM public.role_has_permissions rhp
            WHERE rhp.role_id = r_role_template.id
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- =====================================================
    -- VALIDACIONES FINALES
    -- =====================================================
    EXECUTE format(
        'SELECT EXISTS (
            SELECT 1
            FROM %I.area_ref_empresa
            WHERE ref_empresa_id = $1
              AND area_id = $2
        )',
        v_schema_name
    )
    INTO v_area_link_exists
    USING v_empresa_id, v_area_general_id;

    IF NOT v_area_link_exists THEN
        RAISE EXCEPTION 'No quedó creado el vínculo del área general con la empresa ID %.', v_empresa_id;
    END IF;

    SELECT COUNT(*)
    INTO v_roles_empresa_count
    FROM public.roles
    WHERE ref_empresa_id = v_empresa_id;

    IF v_roles_empresa_count <= 0 THEN
        RAISE EXCEPTION 'No se encontraron roles creados para la empresa ID %.', v_empresa_id;
    END IF;

    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Empresa corregida correctamente';
    RAISE NOTICE 'Última empresa detectada ID: %', v_empresa_id;
    RAISE NOTICE 'Schema detectado: %', v_schema_name;
    RAISE NOTICE 'Área general ID: %', v_area_general_id;
    RAISE NOTICE 'Roles totales en la empresa: %', v_roles_empresa_count;
    RAISE NOTICE 'Permisos por rol copiados: %', CASE WHEN v_has_role_permissions THEN 'SI' ELSE 'NO (tabla no existe)' END;
    RAISE NOTICE '==============================================';

END $$;

COMMIT;