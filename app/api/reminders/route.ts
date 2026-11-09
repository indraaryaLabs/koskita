import { NextResponse, type NextRequest } from "next/server";
import { sb, getOwnerContext } from "@/lib/supabase";

/** Log pengingat: dipanggil dari tombol "Ingatkan" (F5) */
export async function POST(req: NextRequest) {
  const ctx = await getOwnerContext();
  const client = await sb();
  if (!client || !ctx) {
    return NextResponse.json({ ok: false, error: "not_authenticated" }, { status: 401 });
  }

  let body: { invoice_id?: string; template?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const { invoice_id, template } = body;
  if (!invoice_id || !["ramah", "pengingat", "tegas"].includes(template ?? "")) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const { error } = await client
    .from("reminders")
    .insert({ invoice_id, template, sent_by: ctx.user.user_id });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
