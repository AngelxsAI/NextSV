# Administrar NextSV desde el teléfono

## Entrar

Abre la dirección del negocio seguida de `/login`. Ingresa con tu cuenta y el código TOTP. No compartas el QR de inscripción. Para salir usa «Cerrar sesión»; en móvil el menú superior permite cambiar de sección.

## Añadir productos

1. Abre Productos → Nuevo producto.
2. Escribe nombre, SKU único y URL amigable, por ejemplo `lampara-solar`.
3. Completa descripción, precio en dólares, existencias y categoría.
4. Añade solo las características reales, condiciones de garantía y entrega.
5. Guarda como borrador. Desde ese momento los cambios válidos del borrador se autoguardan tras una pausa.
6. Carga fotografías PNG, JPEG o WebP. Cambia su orden con Subir/Bajar; la primera es la principal.
7. Añade variantes si existen, con SKU únicos.
8. Revisa los campos obligatorios. Cambia a Publicado y guarda cuando esté completo.

Para programar, selecciona Programado y una fecha. El formulario usa la hora local del dispositivo y la guarda en UTC. Verifica que la zona horaria del teléfono sea correcta.

Si otra persona modificó el producto, el guardado muestra un conflicto. Conserva el texto que necesites, recarga y concilia los cambios. No se sobrescribe silenciosamente.

La duplicación crea un borrador con identificadores nuevos; no copia fotografías ni variantes, para evitar duplicar SKU y vínculos sin revisión.

## Existencias y ofertas

Modifica las existencias y guarda. El historial registra el cambio de stock del producto. Los stocks de variantes se gestionan por separado; revisa que el total informado en el producto sea coherente.

Una oferta debe ser menor al precio normal. Las fechas de inicio/fin son opcionales; si las usas, la oferta se muestra solo durante su vigencia. El catálogo filtra actualmente por precio normal, no por el importe temporal de oferta.

## Campos personalizados

En Campos, define nombre, clave interna, tipo, opciones, obligatoriedad, visibilidad, inclusión en imágenes y categorías. El valor se valida tanto en la API como en PostgreSQL. No introduzcas HTML.

Los tipos imagen y archivo permiten cargar PNG, JPEG o WebP de hasta 5 MB. Los archivos se vinculan al producto al guardar. Solo los campos públicos de productos publicados permiten lectura pública del archivo. No se aceptan PDF ni SVG.

## Imágenes comerciales

Abre Estudio visual, selecciona un producto con fotografía y ajusta formato, colores, tipografía, alineación, campos, QR y marca. Descarga PNG/JPEG/WebP cuando el navegador lo admita. El ZIP contiene los cuatro tamaños para el producto seleccionado.

Si hay demasiado texto, reduce campos o selecciona un formato más alto. Compartir archivo usa la función del navegador; si no existe, se descarga la imagen y debes adjuntarla manualmente. Copiar URL y consultar por WhatsApp son acciones diferentes de enviar un archivo.

## Contenido del negocio

En Mi negocio, edita identidad, datos de contacto, aviso, fotografía de banner, logotipo, color, preguntas frecuentes y redes. Guardar borrador no publica; revisa la vista previa y después usa Publicar cambios.

En Páginas, edita políticas e información. Los nueve textos iniciales son borradores: completa los datos reales, solicita revisión legal y solo entonces quita la marca de borrador y publica.

## Operaciones de catálogo

Buscar y filtrar por estado. Seleccionar productos permite archivar, despublicar, enviar a papelera o recuperar. No hay borrado irreversible desde la app.

Exportar CSV descarga los productos de la vista cargada. Importar CSV valida antes de crear y siempre crea borradores; no actualiza productos existentes por SKU. Si hay un fallo a mitad, revisa el número guardado antes de reintentar para evitar duplicados.
