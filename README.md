# NextSV

Plataforma comercial en español: catálogo público y administración privada con Next.js, TypeScript y Supabase.

**Estado: implementación local en verificación; no desplegada.** El usuario pospuso las cuentas externas. No hay proyecto Supabase, repositorio remoto ni Worker creados por esta entrega. Consulta [ESTADO.md](ESTADO.md) para la evidencia y los pendientes. No debe presentarse como un sistema listo para producción antes de completar esa lista.

## Inicio

Requisitos: Node.js 22 o superior y pnpm 11.25.0. Se recomienda Linux para compilar OpenNext.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

En Windows, copia `.env.example` a `.env.local` con el explorador o `Copy-Item`. Completa URL y clave **publicable** de Supabase. No uses una clave administrativa ni `service_role`.

Sin configuración, el sitio muestra un estado pendiente y el panel permanece cerrado. No se insertan productos de demostración. Los datos utilizados en tests existen únicamente en entornos efímeros de prueba.

## Documentación

- [Instalación y despliegue](docs/INSTALACION.md).
- [Arquitectura y datos](docs/ARQUITECTURA.md).
- [Guía de administración desde el teléfono](docs/ADMINISTRACION.md).
- [Seguridad, mantenimiento y recuperación](docs/OPERACION.md).
- [Costos, límites y fuentes](docs/COSTOS-Y-FUENTES.md).
- [Estado de entrega y pruebas](ESTADO.md).

## Comandos

| Comando           | Finalidad                                               |
| ----------------- | ------------------------------------------------------- |
| `pnpm dev`        | Desarrollo                                              |
| `pnpm lint`       | ESLint                                                  |
| `pnpm typecheck`  | TypeScript estricto                                     |
| `pnpm test`       | Validación y PostgreSQL embebido                        |
| `pnpm build`      | Compilación Next.js                                     |
| `pnpm test:e2e`   | Playwright; requiere build y Chromium                   |
| `pnpm cf:build`   | Conversión de Next.js a Worker mediante OpenNext        |
| `pnpm cf:preview` | Vista previa en workerd                                 |
| `pnpm cf:deploy`  | Publicación en Cloudflare con credenciales configuradas |

## Estructura

`src/app/(public)`: catálogo SSR, productos y páginas informativas.
`src/app/admin`: panel con validación de sesión, MFA y permisos.
`src/app/api/admin`: escrituras con validación, comprobación de Origin y permisos.
`src/lib`: esquemas, Supabase, archivos y generación de imágenes.
`supabase/migrations`: estructura versionada, políticas y borradores legales.
`tests`: pruebas unitarias, de PostgreSQL y E2E.
`.github/workflows`: validación y despliegue condicionado a configuración explícita.

Sin pagos en línea. La consulta por WhatsApp transmite texto y enlace; la fotografía se comparte como archivo solo cuando el navegador admite Web Share.
