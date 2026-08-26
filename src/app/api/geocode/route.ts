import { NextRequest, NextResponse } from "next/server";
import { searchLocations } from "@/lib/geocode";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchLocations(q);
  return NextResponse.json({ results });
}
