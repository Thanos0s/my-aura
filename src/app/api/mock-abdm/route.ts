import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const bundle = await request.json();
  return NextResponse.json({
    ok: true,
    mocked: true,
    message: "HIS simulator accepted FHIR bundle. This is not live ABDM.",
    receivedResourceType: bundle?.resourceType ?? null,
  });
}
