import { NextResponse } from "next/server";
export async function GET() {
  const team = process.env.APPLE_TEAM_ID;
  if (!team)
    return NextResponse.json(
      { error: "Universal-link association is not configured." },
      { status: 503 },
    );
  return NextResponse.json({
    applinks: {
      details: [
        {
          appIDs: [`${team}.com.just1date.app`],
          components: [
            { "/": "/profile/*" },
            { "/": "/match/*" },
            { "/": "/conversation/*" },
            { "/": "/messages/*" },
          ],
        },
      ],
    },
  });
}
