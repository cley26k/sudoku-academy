import { useEffect, useState } from 'react';
export function go(route: string) {
  route = route.replace(/_/g, '-'); // el visor solo admite letras, dígitos y guiones en el hash
  try { if (location.hash.slice(1) === route) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = route; } catch { /* sin hash */ }
  try { window.scrollTo({ top: 0 }); } catch { /* noop */ }
}
export function useRoute(): string {
  const read = () => { try { return location.hash.slice(1) || 'inicio'; } catch { return 'inicio'; } };
  const [r, setR] = useState(read);
  useEffect(() => { const f = () => setR(read()); window.addEventListener('hashchange', f); return () => window.removeEventListener('hashchange', f); }, []);
  return r;
}
