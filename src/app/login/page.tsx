export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { AuthForm } from '@/components/auth-form';
import { configured } from '@/lib/supabase';
export const metadata = {
  title: 'Acceso privado',
  robots: { index: false, follow: false },
};
export default function Login() {
  return (
    <main id="contenido" className="auth-shell">
      <Link href="/" className="brand">
        <span className="brand-mark">N</span>NextSV
      </Link>
      <h1>Tu negocio, en tus manos.</h1>
      <p className="muted">Ingresa a tu espacio de administración.</p>
      <div className="panel">
        {configured() ? (
          <AuthForm />
        ) : (
          <div className="notice">
            Primero conecta tu proyecto de Supabase y crea la cuenta propietaria
            siguiendo la guía de instalación. El acceso permanece cerrado hasta
            completar la configuración.
          </div>
        )}
      </div>
    </main>
  );
}
