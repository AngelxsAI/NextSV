'use client';
import { browserDb } from '@/lib/browser-db';
export function Logout() {
  return (
    <button
      className="button button-ghost"
      onClick={async () => {
        const { error } = await browserDb().auth.signOut();
        if (!error) location.assign('/login');
        else alert('No se pudo cerrar sesión. Inténtalo de nuevo.');
      }}
    >
      Cerrar sesión
    </button>
  );
}
