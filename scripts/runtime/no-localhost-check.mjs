import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const ROOT_DIR = process.cwd();
const SCAN_DIRECTORIES = ["src/main", "src/preload", "src/renderer", "src/shared"];
const SCAN_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"]);

const FORBIDDEN_PATTERNS = [
  {
    label: "localhost reference",
    regex: /localhost/gi
  },
  {
    label: "loopback address",
    regex: /127\.0\.0\.1/g
  },
  {
    label: "HTTP server creation",
    regex: /(?:http|https)\.createServer\s*\(/g
  },
  {
    label: "Node HTTP module import",
    regex: /from\s+["']node:http["']|require\(["']node:http["']\)/g
  }
];

async function collectFiles(directory) {
  const absoluteDirectory = path.join(ROOT_DIR, directory);
  const directoryStat = await stat(absoluteDirectory);

  if (!directoryStat.isDirectory()) {
    return [];
  }

  const files = [];
  const entries = await readdir(absoluteDirectory, { withFileTypes: true });

  for (const entry of entries) {
    const absolutePath = path.join(absoluteDirectory, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await collectFiles(path.join(directory, entry.name));
      files.push(...nestedFiles);
      continue;
    }

    if (entry.isFile() && SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(directory, entry.name));
    }
  }

  return files;
}

async function run() {
  const findings = [];

  for (const directory of SCAN_DIRECTORIES) {
    let filesInDirectory = [];
    try {
      filesInDirectory = await collectFiles(directory);
    } catch {
      continue;
    }

    for (const relativeFilePath of filesInDirectory) {
      const absoluteFilePath = path.join(ROOT_DIR, relativeFilePath);
      const source = await readFile(absoluteFilePath, "utf8");

      for (const { label, regex } of FORBIDDEN_PATTERNS) {
        const matches = source.match(regex);
        if (!matches || matches.length === 0) {
          continue;
        }

        findings.push({
          file: relativeFilePath,
          label,
          count: matches.length
        });
      }
    }
  }

  if (findings.length > 0) {
    console.error("Runtime localhost guardrail failed:");
    for (const finding of findings) {
      console.error(
        `- ${finding.file}: found ${finding.count} ${finding.label} pattern(s)`
      );
    }
    process.exit(1);
  }

  console.log("Runtime localhost guardrail passed.");
}

void run();
