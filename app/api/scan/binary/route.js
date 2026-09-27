import { NextResponse } from "next/server";
import { scanBuffer } from "@/lib/scanner";
import AdmZip from "adm-zip"; 

export const maxDuration = 60;

function extractApkEntries(buf) {
  try {
    const zip = new AdmZip(buf);
    return zip.getEntries()
      .map((e) => e.entryName)
      .sort()
      .slice(0, 200); 
  } catch {
    return [];
  }
}

export async function POST(req) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const filename = file.name ?? "unknown";
    const buf = Buffer.from(await file.arrayBuffer());

    if (buf.length > 50 * 1024 * 1024)
      return NextResponse.json({ error: "File too large — max 50MB" }, { status: 413 });

    const ext = filename.split(".").pop()?.toLowerCase();
    const vulnerabilities = scanBuffer(buf, filename);

    let apk_entries = [];
    if (ext === "apk") {
      apk_entries = extractApkEntries(buf);
    }

    return NextResponse.json({
      filename,
      filesize: buf.length,
      mode: "binary",
      scanned_at: new Date().toISOString(),
      total: vulnerabilities.length,
      vulnerabilities,
      apk_entries,
    });
  } catch (e) {
    return NextResponse.json({ error: "Scan failed: " + e.message }, { status: 500 });
  }
}