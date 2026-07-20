import { createClient } from "@supabase/supabase-js";

const BUCKET = "barbearia";

/** Faz upload de uma imagem via service_role e retorna a URL pública. Server-only. */
export async function uploadImagem(file: File, pasta: string): Promise<string> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error("Storage não configurado.");

  const supabase = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const sufixo = Math.random().toString(36).slice(2, 8);
  const path = `${pasta}/${Date.now()}-${sufixo}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;

  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
