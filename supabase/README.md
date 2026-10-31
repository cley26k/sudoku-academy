# Activar la liga y el ranking (Supabase, gratis)

1. Crea una cuenta en https://supabase.com y pulsa **New project** (el plan gratuito sirve).
2. En el proyecto, abre **SQL Editor → New query**, pega todo `schema.sql` y pulsa **Run**.
3. En **Project Settings → API** copia:
   - **Project URL** (por ejemplo `https://abcd1234.supabase.co`)
   - **anon public key** (la clave pública; *no* la `service_role`)
4. Pon los dos valores en `supabase/config.json`:

   ```json
   { "url": "https://abcd1234.supabase.co", "anonKey": "eyJhbGciOi..." }
   ```

5. Compila (`node scripts/build.mjs`) y sube la carpeta `docs/` a GitHub Pages.

## Cómo funciona

- **Ligas semanales** (Bronce → Diamante, 10 niveles). Cada semana (lunes 00:00 UTC) cada jugador entra en un grupo de hasta 30 personas de su liga.
- Al cerrar la semana, los **7 primeros suben** y, en grupos de 10 o más, los **5 últimos bajan**. El cierre se calcula la primera vez que el jugador vuelve a conectarse.
- **Top semanal** y **top histórico** globales (los 50 mejores y tu puesto).
- La XP semanal la calcula el servidor a partir de cuánto sube tu XP total, con límites por envío, para evitar trampas groseras.
- Las tablas no son accesibles desde la web: solo las funciones `sa_register`, `sa_sync`, `sa_group` y `sa_top`. Cada jugador tiene una clave secreta guardada en su navegador (se incluye al exportar el progreso, así puedes pasarte a otro dispositivo).
- Solo se publica: nombre elegido, XP, nivel, racha y el aspecto de la mascota.
