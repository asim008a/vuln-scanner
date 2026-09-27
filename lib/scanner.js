import AdmZip from "adm-zip";
import rules from "./rules.json" assert { type: "json" };

const PRINTABLE_MIN_LENGTH = 6;

const TEXT_EXTENSIONS = new Set([
  "js", "ts", "jsx", "tsx", "java", "kt", "cpp", "c", "h",
  "py", "rb", "php", "go", "rs", "swift", "cs", "sh", "env",
  "xml", "json", "yaml", "yml", "toml", "html", "css", "smali",
]);

function isTextFile(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  return TEXT_EXTENSIONS.has(ext);
}

function isApk(buffer) {
  return buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function extractStringsFromBuffer(buffer) {
  const strings = [];
  let current = "";

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    if (byte >= 0x20 && byte <= 0x7e) {
      current += String.fromCharCode(byte);
    } else {
      if (current.length >= PRINTABLE_MIN_LENGTH) strings.push(current);
      current = "";
    }
  }

  if (current.length >= PRINTABLE_MIN_LENGTH) strings.push(current);
  return strings;
}

function extractFromApk(buffer) {
  const lines = [];
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    for (const entry of entries) {
      if (entry.isDirectory) continue;
      const name = entry.entryName.toLowerCase();

      if (
        name.endsWith(".xml") || name.endsWith(".js") ||
        name.endsWith(".json") || name.endsWith(".smali") ||
        name.endsWith(".txt") || name.endsWith(".html")
      ) {
        try {
          const content = entry.getData().toString("utf-8");
          lines.push(...content.split("\n"));
        } catch (_) {}
      } else {
        lines.push(...extractStringsFromBuffer(entry.getData()));
      }
    }
  } catch (err) {
    console.error("APK extraction failed:", err.message);
  }

  return lines;
}

export function scanBuffer(buffer, filename) {
  const patterns = rules.patterns;
  const vulnerabilities = [];
  let lines = [];

  if (isApk(buffer)) {
    lines = extractFromApk(buffer);
  } else if (isTextFile(filename)) {
    lines = buffer.toString("utf-8").split("\n");
  } else {
    lines = extractStringsFromBuffer(buffer);
  }

  for (const line of lines) {
    for (const rule of patterns) {
      const regex = new RegExp(rule.regex, "i");
      if (regex.test(line)) {
        const issue = {
          rule_id: rule.id,
          name: rule.name,
          severity: rule.severity,
          description: rule.description,
          match: line.trim().slice(0, 120),
        };

        const isDuplicate = vulnerabilities.some(
          (v) => v.rule_id === issue.rule_id && v.match === issue.match
        );

        if (!isDuplicate) vulnerabilities.push(issue); // push not append 💀
      }
    }
  }

  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  vulnerabilities.sort((a, b) => (order[a.severity] ?? 4) - (order[b.severity] ?? 4));

  return vulnerabilities;
}