import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@ftc/supabase";
import { listGardenNotifications, markGardenNotificationRead } from "../../../lib/gardenPortalNotifications";

export async function GET(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  const { data: authData, error: authError } = await (supabase.auth as any).getUser();
  if (authError || !authData.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") || 30);

  try {
    const notifications = await listGardenNotifications(
      supabase,
      String(authData.user.email),
      String(authData.user.id || ""),
      limit
    );
    return NextResponse.json({ ok: true, notifications });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to load notifications";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = createServerClient(req.headers);
  const { data: authData, error: authError } = await (supabase.auth as any).getUser();
  if (authError || !authData.user?.email) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json().catch(() => null);
  const notificationId = String(payload?.notification_id || "").trim();
  if (!notificationId) {
    return NextResponse.json({ ok: false, error: "notification_id is required" }, { status: 400 });
  }

  try {
    await markGardenNotificationRead(
      supabase,
      notificationId,
      String(authData.user.email),
      String(authData.user.id || "")
    );
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unable to mark notification";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

