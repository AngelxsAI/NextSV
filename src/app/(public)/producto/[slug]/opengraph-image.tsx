import { ImageResponse } from 'next/og';
import { product, money } from '@/lib/catalog';
import { activePrice } from '@/lib/schemas';
export const runtime = 'nodejs';
export const alt = 'Producto de NextSV';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const p = await product((await params).slug);
  if (!p)
    return new ImageResponse(
      <div
        style={{
          display: 'flex',
          background: '#e8f0e8',
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 70,
        }}
      >
        NextSV
      </div>,
      size,
    );
  return new ImageResponse(
    <div
      style={{
        display: 'flex',
        background: '#f5f7f2',
        width: '100%',
        height: '100%',
        padding: 55,
        gap: 45,
      }}
    >
      {p.product_images[0]?.url && (
        <img
          src={p.product_images[0].url}
          width="490"
          height="520"
          alt=""
          style={{ objectFit: 'contain' }}
        />
      )}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          flex: 1,
        }}
      >
        <span style={{ fontSize: 28, color: '#146c52' }}>NextSV</span>
        <h1 style={{ fontSize: p.name.length > 70 ? 32 : 50, lineHeight: 1.1 }}>
          {p.name}
        </h1>
        <strong style={{ fontSize: 55 }}>{money(activePrice(p))}</strong>
        <span style={{ fontSize: 24, marginTop: 20 }}>
          {p.stock ? 'Disponible' : 'Agotado'}
        </span>
      </div>
    </div>,
    size,
  );
}
