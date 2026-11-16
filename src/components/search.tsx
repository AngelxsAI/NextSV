'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
export function SearchBox() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const [suggestions, setSuggestions] = useState<
    { name: string; slug: string }[]
  >([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/catalog?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((d) => setSuggestions(d.products?.slice(0, 5) || []))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [q]);
  return (
    <div className="search-wrap">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const p = new URLSearchParams(params);
          p.set('q', q);
          p.delete('page');
          setOpen(false);
          router.push(`/catalogo?${p}`);
        }}
      >
        <Search size={19} />
        <input
          aria-label="Buscar productos"
          placeholder="¿Qué estás buscando?"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          autoComplete="off"
        />
        <button type="submit">Buscar</button>
      </form>
      {open && q.length >= 2 && suggestions.length > 0 && (
        <ul className="suggestions" aria-label="Sugerencias">
          {suggestions.map((p) => (
            <li key={p.slug}>
              <Link onClick={() => setOpen(false)} href={`/producto/${p.slug}`}>
                {p.name}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
