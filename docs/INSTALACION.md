# Instalación y despliegue

## 1. Crear los servicios gratuitos

Crear o usar cuentas propias en GitHub, Supabase y Cloudflare. La creación de cuentas, verificación del correo y aceptación de condiciones corresponde al titular. No es necesario comprar un dominio: Cloudflare puede asignar una dirección `nextsv.<subdominio-de-cuenta>.workers.dev`. No se ha reservado ese nombre.

Crear proyectos separados de Supabase para desarrollo y producción cuando la cuota lo permita. Nunca probar migraciones destructivas contra producción.

## 2. Supabase

1. Crear un proyecto vacío, guardar su contraseña en un gestor propio y esperar su disponibilidad.
2. Aplicar en orden las migraciones de `supabase/migrations` mediante Supabase CLI o SQL Editor. Para instalaciones futuras, usar CLI y su historial versionado; no volver a ejecutar una migración ya aplicada.
3. En Auth, desactivar registros públicos. Configurar URLs autorizadas exactas para localhost, staging y producción. Habilitar TOTP MFA.
4. Crear/invitar al propietario desde Auth del proyecto. Copiar su UUID y ejecutar, como propietario de la base de datos:

```sql
insert into public.profiles(id, display_name, role)
values ('UUID_REAL_DEL_USUARIO', 'Propietario', 'owner');
```

No hay una contraseña inicial ni una cuenta administrativa incorporada. Nunca insertar claves ni contraseñas en SQL de aplicación. El alta de roles se mantiene fuera del navegador administrativo.

5. Completar `.env.local` con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Son valores publicables; la protección depende de RLS y de la sesión autenticada.
6. Acceder a `/login`, iniciar sesión, registrar el TOTP y verificar el código. El panel y las escrituras requieren `aal2`.
7. Configurar SMTP de producción y comprobar invitación/recuperación; los límites del correo incorporado no son adecuados para asumir entregabilidad comercial.
8. Si se activa Turnstile, configurar su secreto **en Supabase Auth**, y poner únicamente la site key pública en `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. La verificación del token la realiza Auth. No basta con renderizar el widget.

El bucket `catalog` es privado. Las imágenes se obtienen mediante URLs firmadas y políticas que solo exponen productos publicados o recursos de marca publicados. Una URL ya firmada puede seguir funcionando hasta su vencimiento de una hora; despublicar no revoca instantáneamente una URL emitida.

## 3. Validar localmente

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm exec playwright install chromium
pnpm test:e2e
```

Los tests públicos automatizados se ejecutan **sin** variables Supabase: comprueban el estado sin conexión y la protección de rutas. La verificación autenticada contra Supabase requiere un entorno dedicado y usuarios de prueba con MFA; no confundirla con las pruebas de PostgreSQL embebido.

## 4. GitHub privado

Crear un repositorio privado `nextsv` en la cuenta elegida y subir esta carpeta como raíz. No incluir `.env.local`, backups, cookies, claves ni resultados con datos sensibles. El repositorio privado todavía no se ha creado.

Configurar ramas `main` y `develop`, exigir validación y revisión cuando el plan lo permita. Revisar las restricciones de protección de ramas para repositorios privados en el plan utilizado. El workflow incluido valida instalación congelada, lint, tipos, tests, dependencias, build y E2E.

## 5. Cloudflare

OpenNext genera `.open-next/worker.js` y los recursos estáticos. La aplicación usa el runtime Node.js compatible con Workers, HTTP hacia Supabase y Canvas en el cliente. No usa escritura persistente al filesystem del Worker ni procesos de imágenes nativos en las rutas de ejecución.

```sh
pnpm cf:build
pnpm cf:preview
pnpm cf:deploy
```

Ejecutar en Linux/WSL o GitHub Actions. Comprobar el tamaño comprimido y los límites de CPU del plan gratuito. Si no cabe, **no activar un plan de pago automáticamente**: revisar el paquete y decidir con el titular.

Variables de GitHub del entorno protegido `production`:

- NEXT_PUBLIC_SUPABASE_URL.
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.
- NEXT_PUBLIC_SITE_URL: URL HTTPS real de Workers.
- NEXT_PUBLIC_TURNSTILE_SITE_KEY, si está activo.
- ENABLE_DEPLOY: `true` solo después de configurar y probar todo.

Secretos de ese entorno:

- CLOUDFLARE_API_TOKEN, restringido a la cuenta y a Workers.
- CLOUDFLARE_ACCOUNT_ID.

Wrangler necesita también los valores Supabase en el entorno de ejecución. Configurarlos como variables del Worker en el panel o en `wrangler.jsonc` antes del despliegue; los prefijos NEXT_PUBLIC se incorporan además durante la compilación. Nunca colocar un secreto administrativo en una variable pública. Conservar los valores del Worker al desplegar y comprobar que coincidan con los de la compilación.

Staging: utilizar el entorno `staging` de Wrangler con otro proyecto Supabase, otras variables y URL; el workflow no despliega staging automáticamente. Aplicar las migraciones mediante un proceso separado, revisado y con copia previa. No compartir base de datos de producción con pruebas.

## 6. Antes de abrir al público

Verificar: MFA, permisos por rol, carga/lectura de imágenes, CRUD y recarga, imágenes comerciales, sitemap y Open Graph en la URL real, tamaño/CPU del Worker, restauración de PostgreSQL **y Storage**, logs sin secretos, textos legales revisados, información real del proveedor y catálogo real.

En workers.dev no se controla una zona DNS propia ni todas las reglas de WAF disponibles para dominios añadidos a Cloudflare. HTTPS y distribución del Worker funcionan sin comprar dominio. Un dominio propio y reglas de zona se configurarían después; no afirmar que WAF/DNS personalizados están configurados.
