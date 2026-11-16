# Costos, límites y fuentes

Consulta inicial: 15 de noviembre de 2026. Los planes pueden cambiar; verificar en la cuenta antes de activar recursos. No se ha contratado ningún servicio de pago.

| Servicio           | Propuesta                    | Límites a comprobar                                                                                                                                                                         |
| ------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Supabase           | Free para empezar            | La página consultada indica 500 MB de base de datos y 1 GB de archivos; proyectos gratis pueden pausarse tras una semana de inactividad. Revisar cuota de egreso, Auth y proyectos activos. |
| Cloudflare Workers | Free, subdominio workers.dev | OpenNext documenta 3 MiB comprimidos por Worker en Free. Comprobar requests y CPU según el plan; una compilación que exceda la cuota no se debe publicar contratando automáticamente.       |
| GitHub             | Repositorio privado en Free  | Cuotas de Actions/almacenamiento y disponibilidad de protección de ramas privadas dependen del plan.                                                                                        |
| Dominio            | Sin compra inicial           | workers.dev no equivale a poseer una zona DNS propia. Dominio personalizado supone registro y renovación aparte.                                                                            |
| Turnstile          | Evaluar plan gratuito        | Configuración, dominios admitidos y validación del servidor obligatoria.                                                                                                                    |
| Copias / SMTP      | Elegir al conectar servicios | No asumir backups gestionados, restauración punto en el tiempo o correo de producción ilimitado en Free.                                                                                    |

Canvas y ZIP se ejecutan en el dispositivo y no requieren servicio de generación de imágenes de pago. PGlite, Vitest y Playwright son dependencias de desarrollo, no almacenamiento de producción.

## Fuentes técnicas oficiales

- [Cloudflare y OpenNext](https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/).
- [Compatibilidad de OpenNext: Next.js, Windows y tamaño del Worker](https://opennext.js.org/cloudflare).
- [Supabase: precios](https://supabase.com/pricing).
- [Supabase: Auth SSR](https://supabase.com/docs/guides/auth/server-side).
- [Supabase: MFA](https://supabase.com/docs/guides/auth/auth-mfa).
- [Supabase: protección CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).
- [Cloudflare: widget Turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/).

Cloudflare también recomienda Vinext para nuevos proyectos. Aquí se conserva Next.js solicitado por el usuario y se configura el adaptador OpenNext documentado. La compatibilidad del paquete instalado no sustituye ejecutar el build y pruebas en workerd.

## Fuentes legales oficiales para revisión de borradores

- [Asamblea Legislativa: Ley para la Protección de Datos Personales, decreto 144](https://www.asamblea.gob.sv/leyes-y-decretos/view/6054).
- [Asamblea Legislativa: nota sobre reformas a la ley de datos personales](https://www.asamblea.gob.sv/node/14116).
- [Defensoría del Consumidor: obligaciones](https://www.defensoria.gob.sv/obligaciones/).
- [Defensoría: registro de proveedores en comercio electrónico](https://www.defensoria.gob.sv/servicios/registrocomercioelectronico/).

Las páginas iniciales son borradores operativos y no una certificación de cumplimiento. Se debe comprobar texto consolidado, vigencia, reformas, obligaciones según actividad y datos reales del proveedor antes de publicar. No se inventan NIT, domicilio, registros ni plazos legales.
