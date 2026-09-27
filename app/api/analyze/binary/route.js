import { NextResponse } from "next/server";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen2.5-coder:1.5b";

export async function POST(req) {
  try {
    const { vulnerabilities, filename, filesize } = await req.json();
    if (!vulnerabilities?.length)
      return NextResponse.json({ analysis: null });

    const ext = filename.split(".").pop()?.toLowerCase();
    const isApk = ext === "apk";

    const vulnText = vulnerabilities
      .map((v) => `[${v.severity.toUpperCase()}] ${v.name} (${v.rule_id})\n  Description: ${v.description}\n  Match: ${v.match}`)
      .join("\n\n");

    const prompt = `You are a senior mobile and binary security researcher.

A static analysis scan was performed on "${filename}" (${(filesize / 1024 / 1024).toFixed(2)} MB, ${isApk ? "Android APK" : "binary executable"}).

DETECTED PATTERNS:
${vulnText}

Since this is a binary file, source code is unavailable. Analyze based on the patterns detected:
- For each finding, assess the actual risk in the context of ${isApk ? "an Android application" : "a compiled binary"}
- Identify which findings are most actionable for a security team
- Be specific about attack scenarios for mobile/binary context

Respond with ONLY valid JSON, no markdown:

{
  "findings": [
    {
      "rule_id": "string",
      "name": "string",
      "severity": "critical|high|medium|low",
      "explanation": "2-3 sentences in binary/mobile context",
      "exploitability": "1 sentence: attack scenario specific to ${isApk ? "Android" : "binary"}",
      "fix": "2-3 sentences: how to remediate in source before recompiling"
    }
  ],
  "overall_risk": "critical|high|medium|low",
  "summary": "3-4 sentences covering the binary's overall security posture",
  "recommendations": ["string", "string", "string"]
}`;

    const res = await fetch(OLLAMA_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = await res.json();
    const raw = data?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();

    try {
      return NextResponse.json({ analysis: JSON.parse(cleaned) });
    } catch {
      return NextResponse.json({ analysis: null, raw });
    }
  } catch (e) {
    if (e.name === "TimeoutError") return NextResponse.json({ error: "Analysis timed out" }, { status: 504 });
    if (e.cause?.code === "ECONNREFUSED") return NextResponse.json({ error: "Ollama not running — run: ollama serve" }, { status: 503 });
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}