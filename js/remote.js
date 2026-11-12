// Encrypted cloud backup (Supabase). Only ciphertext is ever sent.
import { SUPABASE_URL, SUPABASE_KEY, SUPABASE_JS } from './config.js';

export async function makeRemote() {
  const { createClient } = await import(SUPABASE_JS);
  const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
  const ok = ({ data, error }) => { if (error) throw error; return data; };
  return {
    async session() { return (await sb.auth.getSession()).data.session; },
    async signIn(email, password) { ok(await sb.auth.signInWithPassword({ email, password })); },
    async signUp(email, password) {
      const data = ok(await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } }));
      return !!data.session; // false means the email still has to be confirmed
    },
    async signOut() { await sb.auth.signOut(); },
    async getProfile() { return ok(await sb.from('profiles').select('salt,check_iv,check_ct').maybeSingle()); },
    async createProfile(p) { ok(await sb.from('profiles').insert(p)); },
    async pushEntry(e) {
      const { error } = await sb.from('entries').insert({ day: e.day, kind: e.kind, iv: e.iv, ct: e.ct, created_at: e.created_at });
      if (error && error.code !== '23505') throw error; // 23505 = already backed up
    },
    async pullEntries() { return ok(await sb.from('entries').select('day,kind,iv,ct,created_at').order('day')); },
  };
}
