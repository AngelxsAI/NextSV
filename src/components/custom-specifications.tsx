import type { Product, FieldDefinition } from '@/lib/types';
import { brandingUrl } from '@/lib/catalog';
export async function CustomSpecifications({
  product,
  fields,
}: {
  product: Product;
  fields: FieldDefinition[];
}) {
  const entries = await Promise.all(
    fields
      .filter((f) => f.is_public)
      .map(async (f) => {
        const value = product.product_field_values.find(
          (v) => v.field_id === f.id,
        )?.value;
        if (value === null || value === undefined || value === '') return null;
        const url = ['image', 'file'].includes(f.type)
          ? await brandingUrl(String(value))
          : undefined;
        return { f, value, url };
      }),
  );
  return (
    <dl className="specs">
      {entries
        .filter((e) => e !== null)
        .map(({ f, value, url }) => (
          <div key={f.id}>
            <dt>{f.name}</dt>
            <dd>
              {f.type === 'image' ? (
                url ? (
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <img
                      src={url}
                      alt={f.name}
                      width="180"
                      height="180"
                      loading="lazy"
                    />
                  </a>
                ) : null
              ) : f.type === 'file' ? (
                url ? (
                  <a
                    className="link-arrow"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Abrir archivo ↗
                  </a>
                ) : null
              ) : f.type === 'url' ? (
                <a
                  className="link-arrow"
                  href={String(value)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Consultar ↗
                </a>
              ) : typeof value === 'boolean' ? (
                value ? (
                  'Sí'
                ) : (
                  'No'
                )
              ) : Array.isArray(value) ? (
                value.join(', ')
              ) : (
                String(value)
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}
