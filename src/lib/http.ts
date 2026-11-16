import 'server-only';
import { NextResponse } from 'next/server';
import { requireStaff } from './supabase';
export async function mutation(request: Request, permission: string) {
  const expected = new URL(
    process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  ).origin;
  if (request.headers.get('origin') !== expected) throw new Error('FORBIDDEN');
  if (Number(request.headers.get('content-length') || 0) > 6 * 1024 * 1024)
    throw new Error('Solicitud demasiado grande.');
  const auth = await requireStaff(permission);
  const { data, error } = await auth.client.rpc('consume_rate_limit', {
    p_action: 'write',
  });
  if (error || !data) throw new Error('RATE_LIMIT');
  return auth;
}
export async function jsonBody(request: Request, max = 250000) {
  const raw = await request.text();
  if (new TextEncoder().encode(raw).length > max)
    throw new Error('Solicitud demasiado grande.');
  return JSON.parse(raw) as unknown;
}
export function apiError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : 'No se pudo completar la operación.';
  const status =
    message === 'UNAUTHORIZED'
      ? 401
      : message === 'FORBIDDEN' || message === 'MFA_REQUIRED'
        ? 403
        : message === 'RATE_LIMIT'
          ? 429
          : message.includes('VERSION_CONFLICT')
            ? 409
            : 400;
  return NextResponse.json({ error: message }, { status });
}
export function dbError(error: { message: string; code?: string } | null) {
  if (error) {
    if (error.message.includes('VERSION_CONFLICT'))
      throw new Error(
        'VERSION_CONFLICT: hay cambios de otro administrador. Recarga antes de guardar.',
      );
    if (error.code === '23505')
      throw new Error('El identificador, SKU o URL ya existe.');
    throw new Error(
      'La base de datos rechazó la operación. Revisa los datos y tus permisos.',
    );
  }
}
