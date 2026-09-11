import { LocalStorageProvider } from "./LocalStorageProvider";
import type { StorageProvider } from "./StorageProvider";

// Swap this for an S3Provider/R2Provider later — every caller only depends
// on the StorageProvider interface, never on the local-disk implementation.
export const storage: StorageProvider = new LocalStorageProvider();

export type { StorageProvider } from "./StorageProvider";
