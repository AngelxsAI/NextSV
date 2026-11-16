# Seguridad, mantenimiento y recuperación

## Controles implementados

- RLS en las tablas públicas y Storage privado.
- MFA AAL2 y permisos reales consultados en el servidor.
- Sesiones SSR con cookies SameSite=Lax; Secure en producción.
- Las cookies de Supabase necesitan acceso del SDK del navegador y no se describen como HttpOnly.
- Origin exacto para mutaciones; rechaza peticiones cruzadas.
- Validación Zod, restricciones SQL y valores personalizados validados por trigger.
- HTML y scripts no admitidos; React escapa contenido. JSON-LD escapa el carácter menor que.
- CSP con nonce por petición; sin unsafe-inline en scripts. Estilos inline permitidos para las opciones de diseño.
- Cabeceras contra MIME sniffing, framing y filtración excesiva de Referer.
- Sin cache pública del panel/API/HTML con sesión.
- Auditoría y control de concurrencia mediante versión.
- Límite de operaciones por administrador persistente en PostgreSQL.
- Firma binaria/MIME/tamaño para cargas raster; nombres aleatorios.

Turnstile solo protege cuando está configurado y activado en Supabase Auth. Los límites de inicio de sesión son los del proveedor Auth, no el limitador SQL para usuarios autenticados. Configurar y probar ambos.

## Controles pendientes de entorno

HTTPS del despliegue, permisos de tokens de CI, protección de ramas, reglas WAF disponibles en el plan, monitorización, recuperación de cuentas MFA, invitaciones y SMTP, backups de producción, rotación de claves, prueba de carga, revisión independiente de seguridad y análisis de malware si se permiten archivos generales.

No introducir scripts de marketing antes de analizar consentimiento. No hay banner ficticio de cookies.

## Operación rutinaria

Semanal: revisar alertas, errores del Worker, cuotas, intentos de acceso y dependencias. Resolver alertas críticas antes de publicar. Revisar cambios de migraciones antes de aplicarlos.

Mensual: ensayar restauración aislada, revisar roles de quienes ya no deben acceder, confirmar condiciones comerciales y páginas legales, revisar alt y tamaño de imágenes, comprobar enlaces y sitemap.

No registrar contraseñas, JWT, cuerpos completos de solicitudes o datos de clientes en logs. El registro de auditoría guarda claves modificadas, no copias de datos privados.

## Copia de seguridad

La base de datos y Storage son dos copias diferentes. Un dump PostgreSQL no contiene los bytes de las imágenes.

1. Exportar esquema y datos mediante Supabase CLI/pg_dump con credenciales restringidas guardadas en un gestor seguro. Consultar el procedimiento oficial vigente para incluir Auth y roles sin duplicar esquemas administrados.
2. Exportar los objetos del bucket conservando rutas y un manifiesto de hashes y tamaños.
3. Cifrar las copias, almacenar fuera del proyecto de producción y aplicar retención definida.
4. Registrar fecha, versión de migración, conteos por tabla y checksum de los archivos.
5. No versionar backups ni credenciales en Git.

## Restauración comprobable

Crear un proyecto de prueba independiente, restaurar según la guía oficial de Supabase, cargar los objetos y reconfigurar URL/claves/redirects. Verificar conteos, relaciones, acceso anónimo, MFA y roles, visualización de imágenes, edición, publicación y revocación de una sesión.

La prueba local incluida de exportación/restauración de PostgreSQL embebido verifica persistencia del esquema y registros de prueba. **No prueba** restauración de Supabase Auth, MFA, Storage ni infraestructura de producción.

## Incidentes

Revocar sesiones/usuarios afectados desde Supabase, retirar tokens expuestos, rotar claves según el alcance, revisar auditoría y logs, corregir la causa y verificar acceso. Rotar claves públicas o de firma puede requerir recompilar y redeplegar el frontend. Mantener acceso de recuperación del titular a Supabase/GitHub/Cloudflare.

No eliminar ni manipular evidencia sin un procedimiento de respuesta. La comunicación y plazos por incidentes de datos requieren revisar la normativa aplicable.
