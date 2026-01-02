import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    // since = ISO timestamp string; if missing, we return the latest batch
    const since = req.query.since ? String(req.query.since) : null;

    // Keep this reasonable; you can increase later
    const limit = Math.min(50_000, Math.max(1, Number(req.query.limit || 50_000)));

    let q = supabase
      .from("pixels")
      .select("idx, placed_at")
      .order("placed_at", { ascending: true })
      .limit(limit);

    if (since) q = q.gt("placed_at", since);

    const { data, error } = await q;

    if (error) return res.status(500).json({ error: "DB error", detail: error.message });

    // Next cursor = max placed_at we returned (or keep the old one)
    let nextSince = since;
    if (data && data.length) {
      nextSince = data[data.length - 1].placed_at;
    }

    return res.status(200).json({
      pixels: (data || []).map(r => r.idx),
      nextSince: nextSince || null
    });
  } catch (e) {
    return res.status(400).json({ error: "Bad request", detail: String(e?.message || e) });
  }
}
