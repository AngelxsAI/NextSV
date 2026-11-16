'use client';
import Script from 'next/script';
import { useRef } from 'react';
declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
        },
      ) => string;
    };
  }
}
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const key = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!key) return null;
  function render() {
    if (key && ref.current && window.turnstile && !ref.current.hasChildNodes())
      window.turnstile.render(ref.current, {
        sitekey: key,
        callback: onToken,
        'expired-callback': () => onToken(''),
      });
  }
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        onReady={render}
      />
      <div ref={ref} />
    </>
  );
}
