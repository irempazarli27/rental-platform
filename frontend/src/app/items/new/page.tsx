"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { listCategories, type Category } from "@/lib/api/categories";
import { createItem, uploadItemImages } from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { ItemForm, formValuesToPayload, type ItemFormValues } from "@/components/items/ItemForm";

export default function NewItemPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login");
  }, [isLoading, user, router]);

  useEffect(() => {
    listCategories()
      .then(({ categories }) => setCategories(categories))
      .catch(() => setError("Kategoriler yüklenemedi."));
  }, []);

  useEffect(() => {
    return () => photos.forEach((p) => URL.revokeObjectURL(p.url));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function addPhotos(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added = Array.from(files).map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((prev) => [...prev, ...added]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removePhoto(index: number) {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  }

  async function submit(values: ItemFormValues, status: "draft" | "active") {
    setSubmitting(true);
    setError(null);
    try {
      const { item } = await createItem({ ...formValuesToPayload(values), status });
      if (photos.length > 0) {
        try {
          await uploadItemImages(
            item.id,
            photos.map((p) => p.file),
          );
        } catch {
          // The listing itself was created successfully — a failed photo
          // upload shouldn't block the redirect, just let them retry from
          // the item page (which has its own upload control).
        }
      }
      router.push(`/items/${item.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İlan oluşturulamadı.");
      setSubmitting(false);
    }
  }

  if (isLoading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-stone-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-stone-900">Yeni İlan Oluştur</h1>
      <p className="mt-1 text-sm text-stone-600">Eşyanın fotoğraflarını ekle, ardından bilgilerini doldur.</p>

      <div className="mt-8">
        <label className="block text-xs font-medium text-stone-700">Fotoğraflar</label>
        <div className="mt-2 flex flex-wrap gap-3">
          {photos.map((photo, index) => (
            <div key={photo.url} className="group relative h-24 w-24 overflow-hidden rounded-xl bg-stone-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removePhoto(index)}
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
      </div>

      <div className="mt-8">
        <ItemForm
          categories={categories}
          onSubmit={(values) => submit(values, "active")}
          submitting={submitting}
          error={error}
          submitLabel="Yayınla"
          secondaryAction={{ label: "Taslak Olarak Kaydet", onClick: (values) => submit(values, "draft") }}
        />
      </div>
    </div>
  );
}
