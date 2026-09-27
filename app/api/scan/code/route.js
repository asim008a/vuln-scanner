import { NextResponse } from "next/server";
import { scanBuffer } from "@/lib/scanner";

export const maxDuration = 60;

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const filename = file.name ?? "unknown";
    const buf = Buffer.from(await file.arrayBuffer());

    if (buf.length > 10 * 1024 * 1024)
      return NextResponse.json({ error: "File too large — max 10MB for source files" }, { status: 413 });

    const vulnerabilities = scanBuffer(buf, filename);

    return NextResponse.json({
      filename,
      filesize: buf.length,
      mode: "code",
      scanned_at: new Date().toISOString(),
      total: vulnerabilities.length,
      vulnerabilities,
    });
  } catch (e) {
    return NextResponse.json({ error: "Scan failed: " + e.message }, { status: 500 });
  }
}