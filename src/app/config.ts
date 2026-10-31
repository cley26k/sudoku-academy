// Se rellenan al compilar desde supabase/config.json (o las variables SA_SUPABASE_URL / SA_SUPABASE_KEY).
// La «anon key» de Supabase es pública por diseño: la seguridad la ponen las funciones del servidor.
declare const __SA_SUPABASE_URL__: string;
declare const __SA_SUPABASE_KEY__: string;
export const SUPABASE_URL: string = __SA_SUPABASE_URL__;
export const SUPABASE_ANON_KEY: string = __SA_SUPABASE_KEY__;
