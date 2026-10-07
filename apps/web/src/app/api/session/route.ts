import { NextResponse } from "next/server";
import { supabaseServer, configured } from "../../../lib/supabase-server";
export async function GET() {
  if (!configured())
    return NextResponse.json({ access_token: null }, { status: 503 });
  try {
    const auth = await supabaseServer();
    const { data, error } = await auth.auth.getUser();
    if (error || !data.user)
      return NextResponse.json({ access_token: null }, { status: 401 });
    const session = await auth.auth.getSession();
    return NextResponse.json(
      {
        access_token: session.data.session?.access_token,
        user_id: data.user.id,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json({ access_token: null }, { status: 401 });
  }
}
