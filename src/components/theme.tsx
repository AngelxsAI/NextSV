'use client';
import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  return (
    <button
      className="icon-button"
      aria-label="Cambiar tema"
      onClick={() => {
        document.documentElement.dataset.theme = dark ? 'light' : 'dark';
        setDark(!dark);
      }}
    >
      {dark ? <Sun size={19} /> : <Moon size={19} />}
    </button>
  );
}
