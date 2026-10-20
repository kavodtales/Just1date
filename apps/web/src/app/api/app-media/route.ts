export const runtime = "nodejs";
export async function GET() {
  if (!process.env.API_URL) return Response.json({ data: [] });
  try {
    const response = await fetch(
      new URL("/v1/app-media", process.env.API_URL),
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) throw new Error("unavailable");
    return Response.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(
      { error: { message: "App images are temporarily unavailable." } },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
