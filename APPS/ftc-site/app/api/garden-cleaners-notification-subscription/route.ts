import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";
import { saveGardenPushSubscription } from "../../../lib/gardenPortalNotifications";

export async function POST(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const subscription = payload?.subscription;
  if (!subscription) {
    return NextResponse.json({ ok: false, error: "subscription is required" }, { status: 400 });
  }

  try {
    const result = await saveGardenPushSubscription(supabase, {
      userId: String(authData.user.id || ""),
      userEmail: String(authData.user.email),
      subscription
    });
    return NextResponse.json({ ok: true, pushReady: result.pushReady });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to save subscription";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
