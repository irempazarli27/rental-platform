"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listCategories, type Category } from "@/lib/api/categories";
import { deleteItemImage, getItem, updateItem, uploadItemImages, type ItemDetail } from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { ItemForm, formValuesToPayload, type ItemFormValues } from "@/components/items/ItemForm";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [newPhotos, setNewPhotos] = useState<{ file: File; url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingImageId, setDeletingImageId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ item }, { categories }] = await Promise.all([getItem(id), listCategories()]);
      setItem(item);
      setCategories(categories);
    } catch {
      setLoadError("İlan yüklenemedi.");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // Wait for AuthContext to finish restoring the access token first — otherwise
    // this can 404 as if requested anonymously before the owner's token is attached.
    if (authLoading) return;
    async function run() {
      await load();
    }
    run();
  }, [authLoading, load]);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    return () => newPhotos.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added = Array.from(files).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setNewPhotos((prev) => [...prev, ...added]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeNewPhoto(index: number) {
    setNewPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadStagedPhotos() {
    if (newPhotos.length === 0) return;
    setIsUploading(true);
    setSubmitError(null);
    try {
      await uploadItemImages(
        id,
        newPhotos.map((p) => p.file),
      );
      newPhotos.forEach((p) => URL.revokeObjectURL(p.url));
      setNewPhotos([]);
      await load();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Fotoğraflar yüklenemedi.");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDeleteExisting(imageId: string) {
    setDeletingImageId(imageId);
    setSubmitError(null);
    try {
      await deleteItemImage(id, imageId);
      await load();
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "Fotoğraf silinemedi.");
    } finally {
      setDeletingImageId(null);
    }
  }

  async function submit(values: ItemFormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateItem(id, formValuesToPayload(values));
      if (newPhotos.length > 0) {
        try {
          await uploadItemImages(
            id,
            newPhotos.map((p) => p.file),
          );
        } catch {
          // The rest of the edit saved fine — let them retry the photos from here.
        }
      }
      router.push(`/items/${id}`);
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : "İlan güncellenemedi.");
      setSubmitting(false);
    }
  }

  if (authLoading || isLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  if (loadError || !item) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-red-600">{loadError ?? "İlan bulunamadı."}</div>;
  }

  if (user && item.ownerId !== user.id) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-red-600">Bu ilanı düzenleme yetkin yok.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-stone-900">İlanı Düzenle</h1>

      <div className="mt-8">
        <label className="block text-xs font-medium text-stone-700">Fotoğraflar</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {item.images.map((image) => (
            <div key={image.id} className="group relative h-24 w-24 overflow-hidden rounded-xl bg-stone-100">
              <Image src={`${API_URL}${image.url}`} alt="" fill unoptimized className="object-cover" />
              <button
                type="button"
                onClick={() => handleDeleteExisting(image.id)}
                disabled={deletingImageId === image.id}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900/70 text-white hover:bg-stone-900 disabled:opacity-50"
                aria-label="Fotoğrafı sil"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {newPhotos.map((photo, index) => (
            <div key={photo.url} className="group relative h-24 w-24 overflow-hidden rounded-xl bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeNewPhoto(index)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-900/70 text-white hover:bg-stone-900"
                aria-label="Fotoğrafı kaldır"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-stone-300 text-xs text-stone-500 hover:border-rose-400 hover:text-rose-600"
          >
            <span className="text-xl leading-none">+</span>
            Ekle
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => addPhotos(e.target.files)}
            className="hidden"
          />
        </div>
        {newPhotos.length > 0 && (
          <button
            type="button"
            onClick={uploadStagedPhotos}
            disabled={isUploading}
            className="mt-3 rounded-full border border-stone-300 px-4 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
          >
            {isUploading ? "Yükleniyor..." : "Yeni fotoğrafları hemen yükle"}
          </button>
        )}
        <p className="mt-1 text-xs text-stone-400">
          Yeni eklediğin fotoğraflar, ayrı yüklemezsen &quot;Kaydet&quot;e bastığında otomatik yüklenir.
        </p>
      </div>

      <div className="mt-8">
        <ItemForm
          categories={categories}
          item={item}
          onSubmit={submit}
          submitting={submitting}
          error={submitError}
          submitLabel="Kaydet"
        />
      </div>
    </div>
  );
}
