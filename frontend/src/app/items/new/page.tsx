"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { listCategories, type Category } from "@/lib/api/categories";
import { createItem } from "@/lib/api/items";
import { ApiError } from "@/lib/api/client";
import { ItemForm, formValuesToPayload, type ItemFormValues } from "@/components/items/ItemForm";

export default function NewItemPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
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

  async function submit(values: ItemFormValues, status: "draft" | "active") {
    setSubmitting(true);
    setError(null);
    try {
      const { item } = await createItem({ ...formValuesToPayload(values), status });
      router.push(`/items/${item.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İlan oluşturulamadı.");
      setSubmitting(false);
    }
  }

  if (isLoading || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-sm text-zinc-500">Yükleniyor...</div>;
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Yeni İlan Oluştur</h1>
      <p className="mt-1 text-sm text-zinc-600">
        Fotoğrafları ilanı oluşturduktan sonra ekleyebilirsin.
      </p>

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
