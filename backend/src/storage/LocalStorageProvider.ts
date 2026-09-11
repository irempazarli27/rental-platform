import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env";
import type { SavedFile, StorageProvider } from "./StorageProvider";

const ROOT = path.resolve(process.cwd(), env.uploadDir);

// Keeps writes confined to the upload root even if a caller-supplied
// subdir/filename ever contained path traversal segments.
function safeJoin(...segments: string[]): string {
  const resolved = path.resolve(ROOT, ...segments);
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    throw new Error("Resolved path escapes the upload root");
  }
  return resolved;
}

export class LocalStorageProvider implements StorageProvider {
  async save(
    buffer: Buffer,
    options: { subdir: string; filename: string; contentType: string },
  ): Promise<SavedFile> {
    const relativePath = path.join(options.subdir, options.filename);
    const absolutePath = safeJoin(options.subdir, options.filename);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, buffer);

    return {
      url: `/uploads/${relativePath.split(path.sep).join("/")}`,
      path: relativePath,
    };
  }

  async delete(relativePath: string): Promise<void> {
    const absolutePath = safeJoin(relativePath);
    await rm(absolutePath, { force: true });
  }
}
