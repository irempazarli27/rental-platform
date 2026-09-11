"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listCategories, type Category } from "@/lib/api/categories";
import { getItem, updateItem, type ItemDetail } from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { ItemForm, formValuesToPayload, type ItemFormValues } from "@/components/items/ItemForm";

export default function EditItemPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [item, setItem] = useState<ItemDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  async function submit(values: ItemFormValues) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await updateItem(id, formValuesToPayload(values));
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
