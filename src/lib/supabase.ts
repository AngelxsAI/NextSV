import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
export function configured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export async function db() {
  if (!configured()) throw new Error('Supabase todavía no está configurado.');
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              }),
            );
          } catch {
            /* Server Components cannot set cookies; middleware refreshes them. */
          }
        },
      },
    },
  );
}
export function publicDb() {
  if (!configured()) throw new Error('Supabase todavía no está configurado.');
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
export async function requireStaff(permission?: string) {
  if (!configured()) throw new Error('UNAUTHORIZED');
  const client = await db();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new Error('UNAUTHORIZED');
  const { data: aal } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.currentLevel !== 'aal2') throw new Error('MFA_REQUIRED');
  const { data: allowed, error: checkError } = await client.rpc(
    permission ? 'has_permission' : 'is_staff',
    permission ? { p_permission: permission } : {},
  );
  if (checkError || !allowed) throw new Error('FORBIDDEN');
  return { client, user };
}
