import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const idx = Number(body?.idx);

    if (!Number.isInteger(idx) || idx < 0 || idx >= 1_000_000) {
      return res.status(400).json({ error: "Invalid idx" });
    }

    // Insert; primary key on idx prevents duplicates
    const { error } = await supabase.from("pixels").insert({ idx });

    if (error) {
      // Duplicate key => already taken
      const msg = (error.message || "").toLowerCase();
      if (msg.includes("duplicate") || msg.includes("already exists") || msg.includes("unique")) {
        return res.status(409).json({ error: "taken" });
      }
      return res.status(500).json({ error: "DB error", detail: error.message });
    }

    return res.status(200).json({ ok: true, idx });
  } catch (e) {
    return res.status(400).json({ error: "Bad request", detail: String(e?.message || e) });
  }
}
