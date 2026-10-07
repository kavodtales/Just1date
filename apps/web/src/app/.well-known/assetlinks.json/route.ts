import { NextResponse } from "next/server";
export async function GET() {
  const fingerprints = process.env.ANDROID_SHA256_FINGERPRINTS?.split(
    ",",
  ).filter((x) => /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/.test(x));
  if (!fingerprints?.length)
    return NextResponse.json(
      { error: "Android app-link association is not configured." },
      { status: 503 },
    );
  return NextResponse.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.just1date.app",
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ]);
}
