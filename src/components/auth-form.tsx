'use client';
import { useState } from 'react';
import { browserDb } from '@/lib/browser-db';
import { Button } from './ui/button';
import { Turnstile } from './turnstile';
export function AuthForm() {
  const [email, setEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [factor, setFactor] = useState('');
  const [qr, setQr] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus('');
    try {
      const db = browserDb();
      if (!factor) {
        const { error } = await db.auth.signInWithPassword({
          email,
          password,
          options: { captchaToken },
        });
        if (error)
          throw new Error(
            'No se pudo iniciar sesión. Revisa tus credenciales.',
          );
        const { data: profile } = await db
          .from('profiles')
          .select('id')
          .single();
        if (!profile) {
          await db.auth.signOut();
          throw new Error(
            'Tu cuenta no tiene acceso al panel. Solicita el alta al propietario.',
          );
        }
        const { data: aal } =
          await db.auth.mfa.getAuthenticatorAssuranceLevel();
        if (aal?.currentLevel === 'aal2') {
          location.assign('/admin');
          return;
        }
        const { data: factors, error: ferror } =
          await db.auth.mfa.listFactors();
        if (ferror) throw ferror;
        const verified = factors.totp.find((f) => f.status === 'verified');
        if (verified) setFactor(verified.id);
        else {
          for (const unverified of factors.all.filter(
            (f) => f.status === 'unverified',
          ))
            await db.auth.mfa.unenroll({ factorId: unverified.id });
          const { data, error } = await db.auth.mfa.enroll({
            factorType: 'totp',
            friendlyName: 'NextSV',
          });
          if (error) throw error;
          setFactor(data.id);
          setQr(data.totp.qr_code);
        }
        setStatus(
          'Introduce el código de seis dígitos de tu aplicación de autenticación.',
        );
      } else {
        const { error } = await db.auth.mfa.challengeAndVerify({
          factorId: factor,
          code,
        });
        if (error)
          throw new Error('Código incorrecto o vencido. Intenta de nuevo.');
        location.assign('/admin');
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'Error de acceso.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="stack" onSubmit={submit}>
      {!factor ? (
        <>
          <label>
            Correo electrónico
            <input
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        </>
      ) : (
        <>
          {qr && (
            <>
              <p>
                Escanea este QR con tu aplicación de autenticación. No lo
                compartas.
              </p>
              <img
                src={qr}
                width="230"
                height="230"
                alt="QR para configurar MFA"
              />
            </>
          )}
          <label>
            Código de seguridad
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
        </>
      )}
      {!factor && <Turnstile onToken={setCaptchaToken} />}
      <Button
        disabled={
          busy ||
          Boolean(
            !factor &&
            process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
            !captchaToken,
          )
        }
      >
        {busy ? 'Verificando…' : factor ? 'Verificar y entrar' : 'Continuar'}
      </Button>
      <p role="status" className="inline-status">
        {status}
      </p>
      <small className="muted">
        Acceso reservado al equipo. La verificación en dos pasos es obligatoria.
      </small>
    </form>
  );
}
