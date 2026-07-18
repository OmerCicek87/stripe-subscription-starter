import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createPortalSession } from "@/lib/stripe/checkout";

export const runtime = "nodejs";

export async function POST() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { url } = await createPortalSession(user.id);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not open billing portal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
