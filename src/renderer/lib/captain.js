import { supabase } from "./supabase";

export async function read(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export async function requireCaptain() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new Error("Please sign in again.");
  const profile = await read(
    supabase.from("profiles").select("rank").eq("id", user.id).single(),
  );
  if (profile.rank?.toLowerCase() !== "captain")
    throw new Error("Captain access required.");
}
export async function captainFunction(name, body) {
  await requireCaptain();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let detail;
    try {
      detail = await error.context?.json();
    } catch {}
    throw new Error(detail?.error || error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
