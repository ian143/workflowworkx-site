import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "File upload has been replaced by cloud drive linking. Use Link Folder on the Projects page instead.",
    },
    { status: 410 }
  );
}
