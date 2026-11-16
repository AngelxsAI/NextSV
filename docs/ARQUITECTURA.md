# Arquitectura de NextSV

## Flujo de datos

Navegador → Next.js SSR/Route Handlers → Supabase Auth + PostgreSQL RLS + Storage privado.

El catálogo público utiliza un cliente anónimo separado, incluso cuando quien lo consulta es administrador. Esto impide que una página pública accidentalmente incluya sus borradores debido a las cookies del administrador.

Las escrituras administrativas pasan por comprobación de Origin, getUser, MFA AAL2, permiso consultado en PostgreSQL, rate limiting y Zod. PostgreSQL vuelve a verificar el rol y MFA con RLS. No se acepta un permiso o rol del navegador.

No hay arrays de productos de demostración ni localStorage como base de datos. Los arrays de React son estado temporal de formularios obtenido de Supabase; la persistencia ocurre en PostgreSQL.

## Entidades

| Entidades                                       | Responsabilidad                                                        |
| ----------------------------------------------- | ---------------------------------------------------------------------- |
| auth.users / profiles                           | Identidad de Supabase y rol administrativo                             |
| roles / permissions                             | owner, editor, viewer y permisos                                       |
| products                                        | Identidad comercial, precio, ofertas, estado, fechas, stock y versión  |
| categories / product_categories                 | Categorías y relación N:M                                              |
| product_variants                                | SKU, color, talla, precio y stock de variantes                         |
| product_images / media_assets                   | Orden, texto alternativo y archivo en Storage                          |
| custom_field_definitions / product_field_values | Definición validada y valores JSONB por producto                       |
| inventory_movements / price_history             | Historial de existencias y cambios de precio                           |
| site_settings / content_pages                   | Borradores y contenido publicado                                       |
| image_templates / generated_assets              | Configuración de diseños y relación disponible para archivos generados |
| audit_logs                                      | Autor, entidad, operación, claves cambiadas y fecha                    |
| contact_requests                                | Seguimiento manual de solicitudes recibidas                            |
| saved_filters / notifications                   | Soporte persistente de preferencias y avisos                           |
| private.rate_limits                             | Ventanas de límite por administrador                                   |

Todas las tablas públicas tienen RLS. Las de auditoría e historial no tienen políticas de escritura para clientes. Perfiles y permisos solo se administran con acceso privilegiado al proyecto, fuera de la app.

El campo views se reserva para analítica verificada; no se incrementa con valores ficticios. La integración de tráfico todavía está pendiente.

## Consistencia

save_product bloquea la fila, exige la versión esperada y actualiza producto, categorías, variantes y campos dentro de una transacción. Un conflicto conserva la versión anterior. La validación de campos obligatorios es diferida hasta el commit para permitir guardar sus valores en la misma transacción.

El autoguardado solo funciona en productos ya guardados como borrador; nunca publica ni modifica un producto publicado automáticamente. La advertencia beforeunload avisa de cambios pendientes al abandonar el documento. La navegación interna también solicita confirmación cuando hay cambios pendientes.

Las ofertas tienen vigencia; su precio visible cambia según fecha. La disponibilidad programada se calcula al consultar con la hora de PostgreSQL. No hace falta un cron para hacer visible un producto programado.

Los productos eliminados van a papelera y se recuperan como borradores. La eliminación física se excluye de la interfaz para evitar pérdida irreversible accidental.

Las importaciones validan todas las filas antes de escribir, pero la persistencia es secuencial: si una fila falla en base de datos, las anteriores quedan guardadas y el panel informa cuántas. No se promete atomicidad de todo el CSV.

## Imágenes

Las cargas admiten JPEG, PNG y WebP de hasta 5 MB, con firma binaria y tipo MIME verificados. SVG y PDF no están habilitados. No se afirma análisis antivirus: añadir archivos generales requiere una cuarentena y un escáner.

El estudio usa Canvas, QR real y ZIP. Ajusta líneas y reduce tipografía hasta un mínimo legible; si el contenido excede el espacio, informa el error y bloquea exportación en lugar de cortar texto. La imagen Open Graph se genera por separado en el servidor.

## Rendimiento

SSR y consultas paginadas del catálogo. Se evita cachear HTML con sesiones o nonces CSP. Los recursos estáticos versionados se distribuyen mediante Workers Assets. La optimización de imágenes con Cloudflare Images requiere configuración y evaluación de costos; actualmente se sirven las imágenes originales y lazy loading. No hay medición certificada de Core Web Vitals todavía.

La lista administrativa tiene límite explícito de 1,000 productos y la importación de 200 filas/archivo. Debe ampliarse con paginación de servidor antes de superar esos límites.
