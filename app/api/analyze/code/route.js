import { NextResponse } from "next/server";

const OLLAMA_URL = "http://localhost:11434/api/chat";
const MODEL = "qwen2.5-coder:1.5b";

export async function POST(req) {
  try {
    const { vulnerabilities, filename, fileContent } = await req.json();
    if (!vulnerabilities?.length)
      return NextResponse.json({ analysis: null });

    const vulnHints = vulnerabilities
      .map((v) => `[${v.severity.toUpperCase()}] ${v.name} (${v.rule_id}) — match: ${v.match}`)
      .join("\n");

    const prompt = `You are a senior application security engineer performing a code review.

File: "${filename}"

SOURCE CODE:
\`\`\`
${(fileContent ?? "").slice(0, 8000)}
\`\`\`

REGEX PRE-SCAN HINTS (treat as hints only, verify against source above):
${vulnHints}

Analyze the source code directly. Do not just parrot the regex hints — use them as starting points and find real issues from reading the code. Ignore false positives that are clearly safe in context.

Respond with ONLY valid JSON. No markdown fences, no preamble:

{
  "findings": [
    {
      "rule_id": "string",
      "name": "string",
      "severity": "critical|high|medium|low",
      "explanation": "2-3 sentences: what this is and why it matters in THIS file",
      "exploitability": "1 sentence: High/Medium/Low and specific attack scenario",
      "fix": "2-3 sentences: concrete actionable fix with code example if possible"
    }
  ],
  "overall_risk": "critical|high|medium|low",
  "summary": "3-4 sentence executive summary of overall security posture",
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
      signal: AbortSignal.timeout(92000_000),
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