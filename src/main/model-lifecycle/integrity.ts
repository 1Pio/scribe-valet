import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export async function sha256File(filePath: string): Promise<string> {
  const hash = createHash("sha256");

  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }

  return hash.digest("hex");
}

export async function verifyFileSha256(
  filePath: string,
  expectedSha256: string
): Promise<boolean> {
  const digest = await sha256File(filePath);
  return digest.toLowerCase() === expectedSha256.toLowerCase();
}
