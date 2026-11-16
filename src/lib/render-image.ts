import QRCode from 'qrcode';
import { activePrice } from './schemas';
import type { Product, FieldDefinition } from './types';
export const sizes = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  story: [1080, 1920],
  landscape: [1200, 630],
} as const;
export type ImageDesign = {
  format: keyof typeof sizes;
  background: string;
  foreground: string;
  accent: string;
  font: 'Arial' | 'Georgia' | 'Verdana';
  fontSize: number;
  align: 'left' | 'center';
  photo: number;
  fields: string[];
  qr: boolean;
  watermark: string;
  logo: string;
  badge: string;
  oldPrice: boolean;
  template: 'classic' | 'minimal' | 'bold';
};
export const defaultDesign: ImageDesign = {
  format: 'square',
  background: '#ffffff',
  foreground: '#162b26',
  accent: '#146c52',
  font: 'Arial',
  fontSize: 42,
  align: 'left',
  photo: 0,
  fields: ['price', 'stock'],
  qr: true,
  watermark: 'NextSV',
  logo: '',
  badge: '',
  oldPrice: true,
  template: 'classic',
};
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(
        new Error(
          'No se pudo cargar la fotografía. Actualiza la página para renovar el enlace.',
        ),
      );
    image.src = src;
  });
}
export function wrapLines(
  ctx: Pick<CanvasRenderingContext2D, 'measureText'>,
  text: string,
  width: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/)) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= width) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      line = '';
      for (const ch of Array.from(word)) {
        if (ctx.measureText(line + ch).width > width && line) {
          lines.push(line);
          line = '';
        }
        line += ch;
      }
    }
    lines.push(line);
  }
  return lines;
}
export async function renderImage(
  canvas: HTMLCanvasElement,
  p: Product,
  design: ImageDesign,
  fields: FieldDefinition[],
  photoUrl: string,
  productUrl: string,
) {
  const [w, h] = sizes[design.format];
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no está disponible.');
  const photo = await loadImage(photoUrl);
  const padding = Math.round(w * 0.05);
  const imageHeight = Math.round(
    h * (design.format === 'landscape' ? 0.48 : 0.55),
  );
  ctx.fillStyle = design.background;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle =
    design.template === 'bold'
      ? design.accent
      : design.template === 'minimal'
        ? design.background
        : '#eff2ee';
  ctx.fillRect(0, 0, w, imageHeight);
  const scale = Math.min(
    (w - padding * 2) / photo.width,
    (imageHeight - padding) / photo.height,
  );
  ctx.drawImage(
    photo,
    (w - photo.width * scale) / 2,
    (imageHeight - photo.height * scale) / 2,
    photo.width * scale,
    photo.height * scale,
  );
  const price = activePrice(p);
  const entries: Record<string, string> = {
    price: `Precio: $${price.toFixed(2)}`,
    stock: `Disponibilidad: ${p.stock} unidades`,
    brand: p.brand ? `Marca: ${p.brand}` : '',
    material: p.material ? `Material: ${p.material}` : '',
    warranty: p.warranty ? `Garantía: ${p.warranty}` : '',
    sku: `Código: ${p.sku}`,
  };
  for (const f of fields) {
    const v = p.product_field_values.find((v) => v.field_id === f.id)?.value;
    if (
      v !== undefined &&
      v !== null &&
      v !== '' &&
      f.type !== 'image' &&
      f.type !== 'file'
    )
      entries[f.id!] =
        `${f.name}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'boolean' ? (v ? 'Sí' : 'No') : v}`;
  }
  const content = design.fields.map((f) => entries[f]).filter(Boolean);
  const footer = Math.max(100, Math.round(h * 0.1));
  const available = h - imageHeight - padding - footer;
  let size = design.fontSize;
  let titleLines: string[] = [];
  let bodyLines: string[] = [];
  for (; size >= 18; size--) {
    ctx.font = `700 ${Math.round(size * 1.32)}px ${design.font}`;
    titleLines = wrapLines(ctx, p.name, w - padding * 2);
    ctx.font = `${size}px ${design.font}`;
    bodyLines = content.flatMap((line) =>
      wrapLines(ctx, line, w - padding * 2),
    );
    const height =
      titleLines.length * size * 1.5 +
      bodyLines.length * size * 1.35 +
      size * 0.65 +
      (design.oldPrice && price !== p.price ? size * 1.3 : 0);
    if (height <= available) break;
  }
  if (size < 18)
    throw new Error(
      'El contenido no cabe de forma legible. Oculta campos o selecciona un formato más alto.',
    );
  const x = design.align === 'center' ? w / 2 : padding;
  ctx.textAlign = design.align;
  ctx.textBaseline = 'top';
  ctx.fillStyle = design.foreground;
  let y = imageHeight + padding;
  ctx.font = `700 ${Math.round(size * 1.32)}px ${design.font}`;
  for (const line of titleLines) {
    ctx.fillText(line, x, y);
    y += size * 1.5;
  }
  y += size * 0.35;
  ctx.font = `${size}px ${design.font}`;
  for (const line of bodyLines) {
    ctx.fillText(line, x, y);
    y += size * 1.35;
  }
  if (design.oldPrice && price !== p.price) {
    const old = `Antes: $${p.price.toFixed(2)}`;
    ctx.fillText(old, x, y);
    const length = ctx.measureText(old).width;
    ctx.beginPath();
    ctx.moveTo(design.align === 'center' ? x - length / 2 : x, y + size * 0.55);
    ctx.lineTo(
      design.align === 'center' ? x + length / 2 : x + length,
      y + size * 0.55,
    );
    ctx.strokeStyle = design.foreground;
    ctx.stroke();
  }
  if (design.badge) {
    ctx.font = `700 26px ${design.font}`;
    const label = design.badge.slice(0, 40);
    const bw = ctx.measureText(label).width + 32;
    ctx.fillStyle = design.accent;
    ctx.fillRect(padding, padding, bw, 50);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(label, padding + 16, padding + 10);
  }
  ctx.textAlign = 'left';
  ctx.fillStyle = design.accent;
  ctx.font = `700 26px ${design.font}`;
  ctx.fillText(
    design.watermark.slice(0, 50),
    padding,
    h - padding - 30,
    w - padding * 2 - 130,
  );
  if (design.logo) {
    const logo = await loadImage(design.logo);
    const scale = Math.min(140 / logo.width, 70 / logo.height);
    ctx.drawImage(
      logo,
      padding,
      h - footer + 10,
      logo.width * scale,
      logo.height * scale,
    );
  }
  if (design.qr) {
    const qr = await loadImage(
      await QRCode.toDataURL(productUrl, {
        margin: 1,
        width: 110,
        errorCorrectionLevel: 'M',
      }),
    );
    ctx.drawImage(qr, w - padding - 110, h - padding - 110, 110, 110);
  }
}
export function canvasBlob(
  canvas: HTMLCanvasElement,
  mime: string,
): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error('No se pudo generar el archivo.'));
        else if (blob.type !== mime)
          reject(
            new Error(
              'Tu navegador no admite este formato. Selecciona PNG o JPEG.',
            ),
          );
        else resolve(blob);
      },
      mime,
      0.94,
    ),
  );
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
