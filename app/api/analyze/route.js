// import { NextResponse } from "next/server";

// const OLLAMA_URL = "http://localhost:11434/api/chat";
// const MODEL = "qwen2.5-coder:1.5b";

// export async function POST(req) {
//   try {
//     const { vulnerabilities, filename, fileContent } = await req.json();

//     if (!vulnerabilities?.length) {
//       return NextResponse.json({ analysis: null });
//     }

//     const vulnText = vulnerabilities
//       .map(
//         (v) =>
//           `[${v.severity.toUpperCase()}] ${v.name} (${v.rule_id})\nDescription: ${v.description}\nMatch: ${v.match}`,
//       )
//       .join("\n\n");

//     const sourceSection = fileContent
//       ? `\n\nSOURCE CODE / FILE CONTENT (first 6000 chars):\n\`\`\`\n${fileContent.slice(0, 6000)}\n\`\`\``
//       : "";

//     const prompt = `You are a senior application security engineer.

// Analyze the following file "${filename}" for security vulnerabilities.

// FILE CONTENT:
// \`\`\`
// ${fileContent.slice(0, 8000)}
// \`\`\`

// ${
//   vulnText
//     ? `REGEX PRE-SCAN HINTS (use as reference only, may have false positives):
// ${vulnText}`
//     : ""
// }

// Perform your OWN independent analysis of the source code above. Do not just explain the regex hints — find real issues from the code itself. The regex hints are supplementary context only.

// Respond ONLY with valid JSON, no markdown, no backticks:

// {
//   "findings": [
//     {
//       "rule_id": "<your own id like SEC-001>",
//       "name": "<vulnerability name>",
//       "severity": "<critical|high|medium|low>",
//       "explanation": "<what this is and why it matters>",
//       "exploitability": "<High/Medium/Low and why>",
//       "fix": "<concrete fix>"
//     }
//   ],
//   "overall_risk": "<critical|high|medium|low>",
//   "summary": "<3-4 sentence executive summary>",
//   "recommendations": ["...", "...", "..."]
// }`;

//     const response = await fetch(OLLAMA_URL, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         model: MODEL,
//         messages: [{ role: "user", content: prompt }],
//         stream: false,
//       }),
//       signal: AbortSignal.timeout(120_000),
//     });

//     if (!response.ok) {
//       throw new Error(`Ollama returned ${response.status}`);
//     }

//     const data = await response.json();
//     const raw = data?.message?.content ?? "";

//     // Strip any accidental markdown fences
//     const cleaned = raw.replace(/```json|```/g, "").trim();

//     let parsed;
//     try {
//       parsed = JSON.parse(cleaned);
//     } catch {
//       // Fallback: return raw text so frontend can show something
//       return NextResponse.json({ analysis: null, raw });
//     }

//     return NextResponse.json({ analysis: parsed });
//   } catch (err) {
//     if (err.name === "TimeoutError") {
//       return NextResponse.json(
//         {
//           error:
//             "Qwen timed out. Try with fewer vulnerabilities or a smaller model.",
//         },
//         { status: 504 },
//       );
//     }
//     if (err.cause?.code === "ECONNREFUSED") {
//       return NextResponse.json(
//         { error: "Ollama is not running. Run: ollama serve" },
//         { status: 503 },
//       );
//     }
//     return NextResponse.json(
//       { error: "AI analysis failed: " + err.message },
//       { status: 500 },
//     );
//   }
// }
