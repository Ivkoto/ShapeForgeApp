import { supabase } from "../clients/supabase";
import type { Contacts } from "../types";

// ── DB row type ──────────────────────────────────────────────────────────────

interface DbContacts {
  id: string;
  user_id: string;
  trainer_name: string | null;
  phone: string | null;
  email: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  website_url: string | null;
  notes: string | null;
}

// ── Fetch contacts ───────────────────────────────────────────────────────────

export async function fetchContacts(userId: string): Promise<Contacts | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<DbContacts>();

  if (error) {
    throw new Error(`Грешка при зареждане на контакти: ${error.message}`);
  }

  if (!data) return null;

  return {
    trainerName: data.trainer_name ?? "",
    phone: data.phone ?? "",
    email: data.email ?? "",
    facebookUrl: data.facebook_url ?? "",
    instagramUrl: data.instagram_url ?? "",
    websiteUrl: data.website_url ?? "",
    notes: data.notes ?? "",
  };
}

// ── Save contacts (upsert) ───────────────────────────────────────────────────

export async function saveContacts(userId: string, contacts: Contacts): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("contacts").upsert(
    {
      user_id: userId,
      trainer_name: contacts.trainerName || null,
      phone: contacts.phone || null,
      email: contacts.email || null,
      facebook_url: contacts.facebookUrl || null,
      instagram_url: contacts.instagramUrl || null,
      website_url: contacts.websiteUrl || null,
      notes: contacts.notes || null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`Грешка при запис на контакти: ${error.message}`);
  }
}
