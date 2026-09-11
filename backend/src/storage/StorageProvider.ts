export interface SavedFile {
  /** Public URL the file can be served from. */
  url: string;
  /** Provider-internal path, used for later deletion. */
  path: string;
}

export interface StorageProvider {
  save(buffer: Buffer, options: { subdir: string; filename: string; contentType: string }): Promise<SavedFile>;
  delete(path: string): Promise<void>;
}
