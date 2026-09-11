import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxUploadSizeMb * 1024 * 1024,
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPEG, PNG or WEBP images are allowed"));
      return;
    }
    cb(null, true);
  },
});

// Handover steps capture either a photo or the walkthrough video, so this
// accepts both — the handover service checks the concrete step requires the
// mime type it actually got (e.g. the VIDEO step must not receive a photo).
const uploadHandoverMedia = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.maxVideoSizeMb * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_IMAGE_TYPES.has(file.mimetype) && !ALLOWED_VIDEO_TYPES.has(file.mimetype)) {
      cb(new Error("Only JPEG/PNG/WEBP photos or MP4/WEBM/MOV videos are allowed"));
      return;
    }
    cb(null, true);
  },
});

type MulterHandler = (req: Request, res: Response, cb: (err: unknown) => void) => void;

function wrapMulter(handler: MulterHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: unknown) => {
      if (err) {
        next(AppError.badRequest(err instanceof Error ? err.message : "Upload failed"));
        return;
      }
      next();
    });
  };
}

export function uploadImagesArray(fieldName: string) {
  return wrapMulter(uploadImages.array(fieldName));
}

export function uploadHandoverMediaSingle(fieldName: string) {
  return wrapMulter(uploadHandoverMedia.single(fieldName));
}
