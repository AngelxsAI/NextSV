import { describe, it, expect } from 'vitest';
import {
  productSchema,
  fieldSchema,
  validateFields,
  activePrice,
  safeCsvCell,
} from '../../src/lib/schemas';
import { detectFile } from '../../src/lib/files';
import { wrapLines } from '../../src/lib/render-image';
const base = {
  sku: 'TEST-1',
  slug: 'producto-prueba',
  name: 'Producto de prueba',
  price: 20,
  stock: 3,
};
describe('Validación comercial', () => {
  it('acepta un producto válido y establece borrador', () =>
    expect(productSchema.parse(base).status).toBe('draft'));
  it.each([-1, NaN, Infinity])('rechaza precio inválido %s', (price) =>
    expect(productSchema.safeParse({ ...base, price }).success).toBe(false),
  );
  it('rechaza HTML', () =>
    expect(
      productSchema.safeParse({ ...base, name: '<script>alert(1)</script>' })
        .success,
    ).toBe(false));
  it('rechaza ofertas mayores al precio normal', () =>
    expect(productSchema.safeParse({ ...base, sale_price: 21 }).success).toBe(
      false,
    ));
  it('requiere fecha para programar', () =>
    expect(
      productSchema.safeParse({ ...base, status: 'scheduled' }).success,
    ).toBe(false));
  it('rechaza SKU duplicados de variantes', () =>
    expect(
      productSchema.safeParse({
        ...base,
        variants: [
          { sku: 'A', stock: 1 },
          { sku: 'A', stock: 2 },
        ],
      }).success,
    ).toBe(false));
  it('respeta la vigencia exacta de ofertas', () => {
    const p = {
      price: 20,
      sale_price: 10,
      sale_starts_at: '2026-01-01T00:00:00Z',
      sale_ends_at: '2026-02-01T00:00:00Z',
    };
    expect(activePrice(p, Date.parse('2026-01-01T00:00:00Z'))).toBe(10);
    expect(activePrice(p, Date.parse('2026-02-01T00:00:00Z'))).toBe(20);
  });
});
describe('Campos personalizados', () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const def = fieldSchema.parse({
    id,
    key: 'potencia',
    name: 'Potencia',
    type: 'number',
    required: true,
    rules: { min: 1, max: 100 },
  });
  it('exige campos obligatorios al publicar', () =>
    expect(() => validateFields([def], [], [], true)).toThrow('obligatorio'));
  it('permite borradores incompletos', () =>
    expect(() => validateFields([def], [], [], false)).not.toThrow());
  it('no convierte texto en números silenciosamente', () =>
    expect(() =>
      validateFields([def], [{ field_id: id, value: '10' }], [], true),
    ).toThrow());
  it('aplica límites', () =>
    expect(() =>
      validateFields([def], [{ field_id: id, value: 101 }], [], true),
    ).toThrow());
  it('rechaza campos desconocidos', () =>
    expect(() =>
      validateFields([], [{ field_id: id, value: 1 }], [], false),
    ).toThrow());
  it('rechaza javascript en URLs', () =>
    expect(() =>
      validateFields(
        [{ ...def, type: 'url' }],
        [{ field_id: id, value: 'javascript:alert(1)' }],
        [],
        true,
      ),
    ).toThrow());
});
describe('Archivos y exportación', () => {
  it('rechaza SVG ejecutable', () =>
    expect(
      detectFile(new TextEncoder().encode('<svg onload="alert(1)">')),
    ).toBeNull());
  it('reconoce PNG por firma', () =>
    expect(detectFile(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(
      'image/png',
    ));
  it('neutraliza fórmulas CSV', () =>
    expect(safeCsvCell('=HYPERLINK("https://example.com")')).toMatch(/^'/));
  it('divide palabras largas sin perder caracteres', () => {
    const ctx = {
      measureText: (s: string) => ({ width: s.length * 10 }) as TextMetrics,
    };
    const lines = wrapLines(ctx, 'ABCDEFGHIJK', 40);
    expect(lines.join('')).toBe('ABCDEFGHIJK');
    expect(lines.every((l) => l.length <= 4)).toBe(true);
  });
});
