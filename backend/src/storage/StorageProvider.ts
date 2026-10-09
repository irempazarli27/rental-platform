export interface SavedFile {
  /** Public URL the file can be served from. */
  url: string;
  /** Provider-internal path, used for later deletion. */
  path: string;
}

export interface StorageProvider {
  save(buffer: Buffer, options: { subdir: string; filename: string; contentType: string }): Promise<SavedFile>;
  delete(path: string): Promise<void>;
  /** Reads back a file previously saved, by its public URL (e.g. "/uploads/items/x.jpg"). */
  readByUrl(url: string): Promise<Buffer>;
}
