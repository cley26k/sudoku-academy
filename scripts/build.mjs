import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { readFileSync as __rf, existsSync as __ex } from 'node:fs';
const __cfg = __ex('supabase/config.json') ? JSON.parse(__rf('supabase/config.json', 'utf8')) : {};
const SB_URL = (process.env.SA_SUPABASE_URL ?? __cfg.url ?? '').replace(/\/+$/, ''), SB_KEY = process.env.SA_SUPABASE_KEY ?? __cfg.anonKey ?? '';
console.log('liga online:', SB_URL ? SB_URL : 'desactivada');
const r = await build({ entryPoints: ['src/app/main.tsx'], bundle: true, minify: true, format: 'iife', write: false, jsx: 'automatic', target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"', __SA_SUPABASE_URL__: JSON.stringify(SB_URL), __SA_SUPABASE_KEY__: JSON.stringify(SB_KEY) }, loader: { '.json': 'json' }, legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const css = readFileSync('src/app/styles.css', 'utf8');
const head = `<title>Sudoku Academy</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Aprende a razonar en Sudoku: lecciones animadas, entrenamiento ilimitado por técnica y un motor lógico verificable.">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap">
<style>${css}</style>`;
const body = `<div id="root"></div>\n<script>${js}</script>`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/artifact.html', head + '\n' + body + '\n');
writeFileSync('dist/index.html', `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${head}</head><body>${body}</body></html>`);
console.log('js', (js.length / 1024).toFixed(0) + 'KB', 'total', ((head.length + body.length) / 1024).toFixed(0) + 'KB');

// ---- Sitio independiente (GitHub Pages, Netlify, Cloudflare Pages…) con PWA ----
mkdirSync('dist-site', { recursive: true });
const pwaHead = `<meta name="theme-color" content="#7c5cff"><link rel="manifest" href="manifest.webmanifest"><link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes">`;
const swReg = `<script>if('serviceWorker' in navigator&&location.protocol!=='file:')addEventListener('load',()=>navigator.serviceWorker.register('sw.js').catch(()=>{}));</script>`;
writeFileSync('dist-site/index.html', `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">${pwaHead}${head}</head><body>${body}${swReg}</body></html>`);
const ver = Date.now().toString(36);
writeFileSync('dist-site/sw.js', `const C='sa-${ver}';
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'])).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(caches.match(e.request).then(hit=>{const net=fetch(e.request).then(r=>{if(r.ok||r.type==='opaque'){const cl=r.clone();caches.open(C).then(c=>c.put(e.request,cl))}return r}).catch(()=>hit);return hit||net}))});
`);
writeFileSync('dist-site/manifest.webmanifest', JSON.stringify({ name: 'Sudoku Academy', short_name: 'Sudoku Academy', description: 'Aprende a razonar en Sudoku, técnica a técnica.', lang: 'es', start_url: './', scope: './', display: 'standalone', background_color: '#ffffff', theme_color: '#7c5cff', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }, { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }] }, null, 2));
writeFileSync('dist-site/.nojekyll', '');
console.log('dist-site listo');
