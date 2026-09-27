"use client";

import { useState, useRef, useEffect } from "react";

const SEV = {
  critical: { pill: "bg-red-950/60 text-red-300 border-red-800/50", dot: "bg-red-400", bar: "bg-red-400" },
  high:     { pill: "bg-orange-950/60 text-orange-300 border-orange-800/50", dot: "bg-orange-400", bar: "bg-orange-400" },
  medium:   { pill: "bg-yellow-950/60 text-yellow-300 border-yellow-800/50", dot: "bg-yellow-400", bar: "bg-yellow-400" },
  low:      { pill: "bg-blue-950/60 text-blue-300 border-blue-800/50", dot: "bg-blue-400", bar: "bg-blue-400" },
};

const RISK_BANNER = {
  critical: "border-red-800/40 bg-red-950/30 text-red-300",
  high:     "border-orange-800/40 bg-orange-950/30 text-orange-300",
  medium:   "border-yellow-800/40 bg-yellow-950/30 text-yellow-300",
  low:      "border-blue-800/40 bg-blue-950/30 text-blue-300",
};

function Skeleton({ lines = 4, className = "" }) {
  return (
    <div className={`space-y-3 ${className}`}>
      <style>{`
        @keyframes ai-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        .ai-shimmer {
          background: linear-gradient(
            90deg,
            #1e1e2e 0%,
            #2a2a3e 20%,
            #7c3aed55 40%,
            #a78bfa66 50%,
            #7c3aed55 60%,
            #2a2a3e 80%,
            #1e1e2e 100%
          );
          background-size: 200% auto;
          animation: ai-shimmer 2.4s linear infinite;
          border-radius: 6px;
        }
      `}</style>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="ai-shimmer h-3"
          style={{
            width: `${[92, 78, 85, 60, 88, 70, 95, 55][i % 8]}%`,
            animationDelay: `${i * 0.12}s`,
          }}
        />
      ))}
    </div>
  );
}

function detectLang(filename = "") {
  const ext = filename.split(".").pop()?.toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", java: "java", kt: "kotlin", cpp: "cpp", c: "c",
    go: "go", rs: "rust", rb: "ruby", php: "php", sh: "shell",
    json: "json", xml: "xml", yaml: "yaml", yml: "yaml", html: "html",
    css: "css", sql: "sql", md: "markdown",
  };
  return map[ext] ?? "plaintext";
}

function tokenize(code, lang) {
  if (lang === "plaintext") return [{ type: "plain", value: code }];

  const keywords = {
    javascript: /\b(const|let|var|function|async|await|return|if|else|for|while|class|import|export|default|from|new|this|typeof|instanceof|throw|try|catch|finally|null|undefined|true|false)\b/g,
    python: /\b(def|class|import|from|as|return|if|elif|else|for|while|try|except|finally|with|lambda|None|True|False|and|or|not|in|is|pass|break|continue|yield|global|nonlocal)\b/g,
    java: /\b(public|private|protected|class|interface|extends|implements|void|int|String|boolean|new|return|if|else|for|while|try|catch|finally|static|final|import|package|this|super|null|true|false)\b/g,
  };
  const kw = keywords[lang] ?? keywords.javascript;

  const tokens = [];
  let last = 0;
  const src = code;

  const strRe = /(["'`])((?:\\.|(?!\1)[^\\])*?)\1/g;
  const cmtRe = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/#?)/g;
  const numRe = /\b(\d+\.?\d*)\b/g;

  const marks = [];
  const addMarks = (re, type) => {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(src)) !== null) marks.push({ s: m.index, e: m.index + m[0].length, type, value: m[0] });
  };
  addMarks(strRe, "string");
  addMarks(cmtRe, "comment");
  addMarks(numRe, "number");
  kw.lastIndex = 0;
  let km;
  while ((km = kw.exec(src)) !== null) marks.push({ s: km.index, e: km.index + km[0].length, type: "keyword", value: km[0] });

  marks.sort((a, b) => a.s - b.s);

  const clean = [];
  let cursor = 0;
  for (const m of marks) {
    if (m.s < cursor) continue;
    clean.push(m);
    cursor = m.e;
  }

  cursor = 0;
  for (const m of clean) {
    if (m.s > cursor) tokens.push({ type: "plain", value: src.slice(cursor, m.s) });
    tokens.push({ type: m.type, value: m.value });
    cursor = m.e;
  }
  if (cursor < src.length) tokens.push({ type: "plain", value: src.slice(cursor) });

  return tokens;
}

const TOKEN_COLOR = {
  keyword: "text-violet-400",
  string:  "text-emerald-400",
  number:  "text-amber-400",
  comment: "text-zinc-500 italic",
  plain:   "text-zinc-200",
};

function CodePane({ filename, content, vulnerabilities = [] }) {
  const lang = detectLang(filename);
  const lines = content.split("\n");

  const flaggedLines = new Set();
  vulnerabilities.forEach((v) => {
    if (!v.match) return;
    lines.forEach((line, i) => {
      if (line.includes(v.match.trim().slice(0, 40))) flaggedLines.add(i);
    });
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] border-b border-white/5 flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        </div>
        <span className="ml-2 text-xs text-zinc-500 font-mono">{filename}</span>
        <span className="ml-auto text-xs text-zinc-600 font-mono">{lang}</span>
      </div>

      <div className="flex-1 overflow-auto bg-[#13131f] font-mono text-xs leading-5">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, i) => {
              const flagged = flaggedLines.has(i);
              const tokens = tokenize(line, lang);
              return (
                <tr
                  key={i}
                  className={`group ${flagged ? "bg-red-950/25" : "hover:bg-white/[0.02]"}`}
                >
                  <td className="select-none text-right pr-4 pl-4 text-zinc-600 w-12 align-top pt-px border-r border-white/5">
                    {i + 1}
                  </td>
                  <td className={`pl-4 pr-4 whitespace-pre align-top pt-px ${flagged ? "border-l-2 border-red-500/60" : ""}`}>
                    {tokens.map((t, j) => (
                      <span key={j} className={TOKEN_COLOR[t.type]}>
                        {t.value}
                      </span>
                    ))}
                    {flagged && (
                      <span className="ml-3 text-red-400/70 text-[10px] align-middle not-italic">
                        ← flagged
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BinaryPane({ filename, filesize, apkEntries = [] }) {
  const ext = filename.split(".").pop()?.toLowerCase();
  const isApk = ext === "apk";

  const sizeStr = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex flex-col h-full bg-[#13131f]">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-[#1a1a2e] border-b border-white/5 flex-shrink-0">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
        </div>
        <span className="ml-2 text-xs text-zinc-500 font-mono">{filename}</span>
        <span className="ml-auto text-xs text-zinc-600 font-mono">{sizeStr(filesize)}</span>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-6">
        <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-medium">File Metadata</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
            {[
              ["Name", filename],
              ["Type", ext?.toUpperCase() ?? "BINARY"],
              ["Size", sizeStr(filesize)],
              ["Format", isApk ? "Android Package (ZIP)" : "PE/ELF Binary"],
            ].map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <span className="text-xs text-zinc-600 w-16 flex-shrink-0 font-mono">{k}</span>
                <span className="text-xs text-zinc-300 font-mono truncate">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {isApk && apkEntries.length > 0 && (
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-medium">Package Structure</p>
            <div className="font-mono text-xs space-y-0.5">
              {apkEntries.map((entry, i) => {
                const depth = entry.split("/").length - 1;
                const name = entry.split("/").pop();
                const isDir = entry.endsWith("/");
                return (
                  <div
                    key={i}
                    className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                  >
                    <span className="text-zinc-600 flex-shrink-0">{isDir ? "▸" : "·"}</span>
                    <span className={isDir ? "text-violet-400/80" : ""}>{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!isApk && (
          <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest mb-3 font-medium">Binary Analysis</p>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Binary file — source code not available. Static analysis performed via pattern scanning
              of raw bytes and embedded strings. See scan results for detected patterns.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis, analyzing, aiRaw, onAnalyze, canAnalyze }) {
  if (analyzing) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton lines={2} />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
            <Skeleton lines={1} />
            <Skeleton lines={3} />
            <Skeleton lines={2} />
          </div>
        ))}
        <Skeleton lines={4} />
      </div>
    );
  }

  if (!analysis && !aiRaw) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/8 flex items-center justify-center">
          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <div>
          <p className="text-sm text-zinc-400 font-medium">No analysis yet</p>
          <p className="text-xs text-zinc-600 mt-1">Run a scan first, then trigger AI analysis</p>
        </div>
        {canAnalyze && (
          <button
            onClick={onAnalyze}
            className="mt-2 px-4 py-2 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-lg transition-colors"
          >
            Run Analysis
          </button>
        )}
      </div>
    );
  }

  if (aiRaw) {
    return (
      <div className="p-5">
        <pre className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap font-mono">{aiRaw}</pre>
      </div>
    );
  }

  const { findings = [], overall_risk, summary, recommendations = [] } = analysis;

  return (
    <div className="p-5 space-y-5 overflow-auto">
      {overall_risk && (
        <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${RISK_BANNER[overall_risk] ?? RISK_BANNER.low}`}>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SEV[overall_risk]?.dot ?? "bg-zinc-400"}`} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest opacity-50">Overall Risk</p>
            <p className="text-sm font-semibold capitalize">{overall_risk}</p>
          </div>
        </div>
      )}

      {findings.length > 0 && (
        <div className="space-y-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 px-1">
            Findings — {findings.length}
          </p>
          {findings.map((f, i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-white/5">
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${SEV[f.severity]?.dot ?? "bg-zinc-400"}`} />
                <span className="text-xs font-semibold text-zinc-200 flex-1 truncate">{f.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${SEV[f.severity]?.pill ?? ""}`}>
                  {f.severity}
                </span>
                <span className="text-[10px] text-zinc-600 font-mono">{f.rule_id}</span>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">What it means</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{f.explanation}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Exploitability</p>
                  <p className="text-xs text-zinc-400 leading-relaxed">{f.exploitability}</p>
                </div>
                <div className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-emerald-500/70 uppercase tracking-wider mb-1">Fix / Mitigation</p>
                  <p className="text-xs text-emerald-300/80 leading-relaxed">{f.fix}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {summary && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Executive Summary</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{summary}</p>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-3">Recommendations</p>
          <div className="space-y-2">
            {recommendations.map((r, i) => (
              <div key={i} className="flex gap-3 text-xs text-zinc-400">
                <span className="text-zinc-700 font-mono flex-shrink-0 mt-px">{String(i + 1).padStart(2, "0")}</span>
                <span className="leading-relaxed">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SeverityBar({ vulnerabilities }) {
  const counts = ["critical", "high", "medium", "low"].reduce((acc, s) => {
    acc[s] = vulnerabilities.filter((v) => v.severity === s).length;
    return acc;
  }, {});
  const total = vulnerabilities.length;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {["critical", "high", "medium", "low"].map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${SEV[s].dot}`} />
          <span className="text-xs text-zinc-500 capitalize">{s}</span>
          <span className="text-xs font-semibold text-zinc-300">{counts[s]}</span>
        </div>
      ))}
      <span className="text-xs text-zinc-600 ml-auto">Total: {total}</span>
    </div>
  );
}

function UploadZone({ mode, onFile, file }) {
  const [drag, setDrag] = useState(false);
  const ref = useRef();
  const isCode = mode === "code";
  const accept = isCode
    ? ".js,.jsx,.ts,.tsx,.py,.java,.kt,.c,.cpp,.go,.rs,.rb,.php,.sh,.json,.yaml,.yml,.html,.css,.sql,.xml,.md"
    : ".apk,.exe,.dll,.so,.elf";

  const handle = (f) => { if (f) onFile(f); };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files[0]); }}
      onClick={() => ref.current.click()}
      className={`border border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200
        ${drag ? "border-violet-500/60 bg-violet-950/20" : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"}`}
    >
      <input ref={ref} type="file" className="hidden" accept={accept} onChange={(e) => handle(e.target.files[0])} />
      {file ? (
        <div className="space-y-1">
          <p className="text-sm font-medium text-zinc-200 font-mono">{file.name}</p>
          <p className="text-xs text-zinc-600">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-zinc-500">
            {isCode ? "Drop source file" : "Drop binary file"}
          </p>
          <p className="text-xs text-zinc-700">
            {isCode ? "js · ts · py · java · kt · go · rs · c · cpp · php" : "apk · exe · dll · so · elf"}
          </p>
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [mode, setMode] = useState("code"); 

  const [codeFile, setCodeFile] = useState(null);
  const [codeContent, setCodeContent] = useState("");
  const [codeScan, setCodeScan] = useState(null);
  const [codeAnalysis, setCodeAnalysis] = useState(null);
  const [codeRaw, setCodeRaw] = useState("");
  const [codeScanning, setCodeScanning] = useState(false);
  const [codeAnalyzing, setCodeAnalyzing] = useState(false);

  const [binFile, setBinFile] = useState(null);
  const [binScan, setBinScan] = useState(null);
  const [binAnalysis, setBinAnalysis] = useState(null);
  const [binRaw, setBinRaw] = useState("");
  const [binScanning, setBinScanning] = useState(false);
  const [binAnalyzing, setBinAnalyzing] = useState(false);
  const [apkEntries, setApkEntries] = useState([]);

  const [error, setError] = useState("");

  const readText = (f) =>
    new Promise((res) => {
      const r = new FileReader();
      r.onload = (e) => res(e.target.result ?? "");
      r.onerror = () => res("");
      r.readAsText(f);
    });

  const handleCodeFile = async (f) => {
    setCodeFile(f);
    setCodeScan(null);
    setCodeAnalysis(null);
    setCodeRaw("");
    setError("");
    const text = await readText(f);
    setCodeContent(text);
  };

  const handleBinFile = (f) => {
    setBinFile(f);
    setBinScan(null);
    setBinAnalysis(null);
    setBinRaw("");
    setApkEntries([]);
    setError("");
  };

  const runCodeScan = async () => {
    if (!codeFile) return;
    setCodeScanning(true);
    setError("");
    const form = new FormData();
    form.append("file", codeFile);
    try {
      const res = await fetch("/api/scan/code", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCodeScan(data);
    } catch (e) { setError(e.message); }
    finally { setCodeScanning(false); }
  };

  const runBinScan = async () => {
    if (!binFile) return;
    setBinScanning(true);
    setError("");
    const form = new FormData();
    form.append("file", binFile);
    try {
      const res = await fetch("/api/scan/binary", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBinScan(data);
      if (data.apk_entries) setApkEntries(data.apk_entries);
    } catch (e) { setError(e.message); }
    finally { setBinScanning(false); }
  };

  const runCodeAnalysis = async () => {
    if (!codeScan?.vulnerabilities?.length) return;
    setCodeAnalyzing(true);
    setCodeAnalysis(null);
    setCodeRaw("");
    try {
      const res = await fetch("/api/analyze/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vulnerabilities: codeScan.vulnerabilities,
          filename: codeScan.filename,
          fileContent: codeContent,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.analysis) setCodeAnalysis(data.analysis);
      else if (data.raw) setCodeRaw(data.raw);
    } catch (e) { setCodeRaw(`Error: ${e.message}`); }
    finally { setCodeAnalyzing(false); }
  };

  const runBinAnalysis = async () => {
    if (!binScan?.vulnerabilities?.length) return;
    setBinAnalyzing(true);
    setBinAnalysis(null);
    setBinRaw("");
    try {
      const res = await fetch("/api/analyze/binary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vulnerabilities: binScan.vulnerabilities,
          filename: binScan.filename,
          filesize: binScan.filesize,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.analysis) setBinAnalysis(data.analysis);
      else if (data.raw) setBinRaw(data.raw);
    } catch (e) { setBinRaw(`Error: ${e.message}`); }
    finally { setBinAnalyzing(false); }
  };

  const exportJSON = (scan, analysis) => {
    const blob = new Blob([JSON.stringify({ ...scan, ai_analysis: analysis }, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `vuln-${scan.filename}-${Date.now()}.json`;
    a.click();
  };

  const isCode = mode === "code";
  const activeScan = isCode ? codeScan : binScan;
  const activeFile = isCode ? codeFile : binFile;
  const activeAnalysis = isCode ? codeAnalysis : binAnalysis;
  const activeRaw = isCode ? codeRaw : binRaw;
  const activeAnalyzing = isCode ? codeAnalyzing : binAnalyzing;
  const activeScanning = isCode ? codeScanning : binScanning;
  const hasResult = !!activeScan;

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-zinc-100 flex flex-col" style={{ fontFamily: "'Berkeley Mono', 'JetBrains Mono', 'Fira Code', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300&display=swap');
        * { font-family: 'DM Mono', 'JetBrains Mono', monospace; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ffffff14; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #ffffff22; }
      `}</style>

      <header className="flex items-center gap-6 px-6 py-3.5 border-b border-white/[0.06] bg-[#0d0d1a]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded bg-violet-600/80 flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-zinc-200 tracking-tight">neoSAST</span>
          <span className="text-[10px] text-zinc-600 border border-white/10 px-1.5 py-0.5 rounded">AI Vulnerability Scanner</span>
        </div>

        <div className="flex items-center gap-1 bg-white/[0.04] border border-white/8 rounded-lg p-1 ml-4">
          {[
            { id: "code", label: "Source File" },
            { id: "binary", label: "Binary / APK" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => { setMode(t.id); setError(""); }}
              className={`px-3 py-1.5 text-xs rounded-md transition-all duration-150 ${
                mode === t.id
                  ? "bg-violet-600 text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {hasResult && (
            <button
              onClick={() => exportJSON(activeScan, activeAnalysis)}
              className="px-3 py-1.5 text-xs text-zinc-400 border border-white/10 rounded-lg hover:border-white/20 hover:text-zinc-200 transition-all"
            >
              Export JSON
            </button>
          )}
          <button
            onClick={isCode ? runCodeScan : runBinScan}
            disabled={!activeFile || activeScanning}
            className="px-4 py-1.5 text-xs font-medium bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {activeScanning ? "Scanning..." : "Run Scan"}
          </button>
          {hasResult && activeScan.vulnerabilities?.length > 0 && (
            <button
              onClick={isCode ? runCodeAnalysis : runBinAnalysis}
              disabled={activeAnalyzing}
              className="px-4 py-1.5 text-xs font-medium border border-violet-500/50 text-violet-300 hover:bg-violet-950/40 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {activeAnalyzing ? "Analyzing..." : activeAnalysis ? "Re-analyze" : "AI Analysis"}
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="mx-6 mt-4 px-4 py-3 rounded-xl border border-red-800/40 bg-red-950/30 text-red-300 text-xs">
          {error}
        </div>
      )}

      {!activeFile ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center space-y-2">
              <p className="text-sm text-zinc-400">
                {isCode ? "Upload a source file to begin scanning" : "Upload a binary or APK to begin scanning"}
              </p>
            </div>
            <UploadZone mode={mode} onFile={isCode ? handleCodeFile : handleBinFile} file={activeFile} />
          </div>
        </div>
      ) : !hasResult ? (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center gap-4 px-6 py-3 border-b border-white/[0.06]">
            <UploadZone mode={mode} onFile={isCode ? handleCodeFile : handleBinFile} file={activeFile} />
          </div>
          <div className="flex-1">
            {isCode ? (
              <CodePane filename={codeFile.name} content={codeContent} vulnerabilities={[]} />
            ) : (
              <BinaryPane filename={binFile.name} filesize={binFile.size} apkEntries={apkEntries} />
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-2.5 border-b border-white/[0.06] flex-shrink-0">
            <button
              onClick={() => isCode ? handleCodeFile(codeFile) : handleBinFile(binFile)}
              className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              ← {activeFile.name}
            </button>
            <div className="flex-1">
              <SeverityBar vulnerabilities={activeScan.vulnerabilities} />
            </div>
            <span className="text-[10px] text-zinc-700">
              {new Date(activeScan.scanned_at).toLocaleTimeString()}
            </span>
          </div>

          {/* Main split pane */}
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT — file viewer */}
            <div className="w-1/2 flex flex-col border-r border-white/[0.06] overflow-hidden">
              {isCode ? (
                <CodePane
                  filename={codeFile.name}
                  content={codeContent}
                  vulnerabilities={codeScan.vulnerabilities}
                />
              ) : (
                <BinaryPane
                  filename={binFile.name}
                  filesize={binFile.size}
                  apkEntries={apkEntries}
                />
              )}
            </div>

            {/* RIGHT — analysis */}
            <div className="w-1/2 flex flex-col overflow-hidden ">
              {/* Right panel header */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] flex-shrink-0">
                <span className="text-xs text-zinc-500">AI Analysis</span>
                {(activeAnalysis || activeRaw) && (
                  <button
                    onClick={isCode ? runCodeAnalysis : runBinAnalysis}
                    disabled={activeAnalyzing}
                    className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
                  >
                    Re-run
                  </button>
                )}
              </div>

              {/* Findings list (always visible on right if scan done) */}
              {!activeAnalysis && !activeRaw && !activeAnalyzing && (
                <div className="border-b border-white/[0.06] flex-shrink-0">
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
                      Pattern Matches
                    </p>
                    <div className="space-y-1">
                      {activeScan.vulnerabilities.slice(0, 20).map((v, i) => (
                        <div key={i} className="flex items-start gap-2.5 py-1">
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${SEV[v.severity]?.dot ?? "bg-zinc-400"}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-zinc-300 truncate">{v.name}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium uppercase ${SEV[v.severity]?.pill ?? ""}`}>
                                {v.severity}
                              </span>
                            </div>
                            <code className="text-[10px] text-zinc-600 block truncate mt-0.5">{v.match}</code>
                          </div>
                        </div>
                      ))}
                      {activeScan.vulnerabilities.length > 20 && (
                        <p className="text-[10px] text-zinc-700 pl-4">
                          +{activeScan.vulnerabilities.length - 20} more findings
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* AI panel */}
              <div className="flex-1 overflow-auto">
                <AnalysisPanel
                  analysis={activeAnalysis}
                  analyzing={activeAnalyzing}
                  aiRaw={activeRaw}
                  onAnalyze={isCode ? runCodeAnalysis : runBinAnalysis}
                  canAnalyze={activeScan?.vulnerabilities?.length > 0}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}