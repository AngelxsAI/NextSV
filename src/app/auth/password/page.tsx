import {PasswordForm} from '@/components/password-form';
export const dynamic='force-dynamic';
export const metadata={title:'Configurar contraseña',robots:{index:false,follow:false}};
export default function Password(){return <main id="contenido" className="auth-shell"><h1>Configura tu acceso</h1><p>Usa esta página después de aceptar la invitación o el enlace de recuperación.</p><div className="panel"><PasswordForm/></div></main>;}
