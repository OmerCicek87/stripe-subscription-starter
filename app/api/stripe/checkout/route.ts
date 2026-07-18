import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe/checkout";
import { isPlanKey } from "@/lib/plans";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const plan = (body as { plan?: unknown })?.plan;
  if (!isPlanKey(plan)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  try {
    const { url } = await createCheckoutSession(user.id, user.email, plan);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
