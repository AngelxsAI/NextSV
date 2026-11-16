import { NextResponse } from 'next/server';
import { catalog } from '@/lib/catalog';
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    return NextResponse.json(
      await catalog(Object.fromEntries(url.searchParams)),
    );
  } catch {
    return NextResponse.json(
      { error: 'No se pudo cargar el catálogo.' },
      { status: 503 },
    );
  }
}
