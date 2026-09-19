"use client";

import { useState, type FormEvent } from "react";
import type { Category } from "@/lib/api/categories";
import type { CreateItemInput, ItemCondition, ItemDetail, DeliveryMethod } from "@/lib/api/items";
import { CONDITION_LABELS, DELIVERY_LABELS } from "@/lib/format";
import { TURKISH_CITIES } from "@/lib/turkishCities";
import { TURKISH_DISTRICTS } from "@/lib/turkishDistricts";

const SORTED_CITIES = [...TURKISH_CITIES].sort((a, b) => a.localeCompare(b, "tr"));

export interface ItemFormValues {
  title: string;
  description: string;
  categoryId: string;
  brand: string;
  model: string;
  serialNumber: string;
  condition: ItemCondition;
  dailyPrice: string;
  weeklyPrice: string;
  depositAmount: string;
  deliveryMethod: DeliveryMethod;
  city: string;
  district: string;
  accessories: { name: string; quantity: string }[];
}

function toFormValues(item?: ItemDetail): ItemFormValues {
  return {
    title: item?.title ?? "",
    description: item?.description ?? "",
    categoryId: item?.categoryId ?? "",
    brand: item?.brand ?? "",
    model: item?.model ?? "",
    serialNumber: item?.serialNumber ?? "",
    condition: item?.condition ?? "good",
    dailyPrice: item?.dailyPrice ?? "",
    weeklyPrice: item?.weeklyPrice ?? "",
    depositAmount: item?.depositAmount ?? "0",
    deliveryMethod: item?.deliveryMethod ?? "pickup",
    city: item?.city ?? "",
    district: item?.district ?? "",
    accessories: item?.accessories.map((a) => ({ name: a.name, quantity: String(a.quantity) })) ?? [],
  };
}

export function formValuesToPayload(values: ItemFormValues): Omit<CreateItemInput, "status"> {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    categoryId: values.categoryId,
    brand: values.brand.trim() || undefined,
    model: values.model.trim() || undefined,
    serialNumber: values.serialNumber.trim() || undefined,
    condition: values.condition,
    dailyPrice: Number(values.dailyPrice),
    weeklyPrice: values.weeklyPrice ? Number(values.weeklyPrice) : undefined,
    depositAmount: values.depositAmount ? Number(values.depositAmount) : 0,
    deliveryMethod: values.deliveryMethod,
    city: values.city.trim() || undefined,
    district: values.district.trim() || undefined,
    accessories: values.accessories
      .filter((a) => a.name.trim())
      .map((a) => ({ name: a.name.trim(), quantity: Number(a.quantity) || 1 })),
  };
}

const inputClass =
  "mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";
const labelClass = "block text-xs font-medium text-stone-700";

export function ItemForm({
  categories,
  item,
  onSubmit,
  submitting,
  error,
  submitLabel,
  secondaryAction,
}: {
  categories: Category[];
  item?: ItemDetail;
  onSubmit: (values: ItemFormValues) => void;
  submitting: boolean;
  error: string | null;
  submitLabel: string;
  secondaryAction?: { label: string; onClick: (values: ItemFormValues) => void };
}) {
  const [values, setValues] = useState<ItemFormValues>(() => toFormValues(item));

  const cityDistricts = TURKISH_DISTRICTS[values.city] ?? [];
  // Keep a previously saved free-text district selectable so editing an older
  // listing doesn't silently blank it out.
  const districtOptions =
    values.district && !cityDistricts.includes(values.district) ? [values.district, ...cityDistricts] : cityDistricts;

  function set<K extends keyof ItemFormValues>(key: K, value: ItemFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit(values);
  }

  function addAccessory() {
    set("accessories", [...values.accessories, { name: "", quantity: "1" }]);
  }

  function updateAccessory(index: number, field: "name" | "quantity", value: string) {
    const next = values.accessories.slice();
    next[index] = { ...next[index], [field]: value };
    set("accessories", next);
  }

  function removeAccessory(index: number) {
    set(
      "accessories",
      values.accessories.filter((_, i) => i !== index),
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor="item-title" className={labelClass}>Eşya Adı</label>
          <input
            id="item-title"
            required
            minLength={3}
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="item-description" className={labelClass}>Açıklama</label>
          <textarea
            id="item-description"
            required
            minLength={10}
            rows={4}
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="item-category" className={labelClass}>Kategori</label>
          <select
            id="item-category"
            required
            value={values.categoryId}
            onChange={(e) => set("categoryId", e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Seçiniz
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-condition" className={labelClass}>Durum</label>
          <select
            id="item-condition"
            value={values.condition}
            onChange={(e) => set("condition", e.target.value as ItemCondition)}
            className={inputClass}
          >
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-brand" className={labelClass}>Marka</label>
          <input id="item-brand" value={values.brand} onChange={(e) => set("brand", e.target.value)} className={inputClass} />
        </div>

        <div>
          <label htmlFor="item-model" className={labelClass}>Model</label>
          <input id="item-model" value={values.model} onChange={(e) => set("model", e.target.value)} className={inputClass} />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="item-serial" className={labelClass}>Seri Numarası (opsiyonel, sadece sende ve uyuşmazlık durumunda görünür)</label>
          <input
            id="item-serial"
            value={values.serialNumber}
            onChange={(e) => set("serialNumber", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="item-daily-price" className={labelClass}>Günlük Kira Fiyatı (₺)</label>
          <input
            id="item-daily-price"
            required
            type="number"
            min={1}
            max={1_000_000}
            step="0.01"
            value={values.dailyPrice}
            onChange={(e) => set("dailyPrice", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="item-weekly-price" className={labelClass}>Haftalık Kira Fiyatı (₺, opsiyonel)</label>
          <input
            id="item-weekly-price"
            type="number"
            min={1}
            max={5_000_000}
            step="0.01"
            value={values.weeklyPrice}
            onChange={(e) => set("weeklyPrice", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="item-deposit" className={labelClass}>Güvence/Depozito Bedeli (₺)</label>
          <input
            id="item-deposit"
            type="number"
            min={0}
            max={1_000_000}
            step="0.01"
            value={values.depositAmount}
            onChange={(e) => set("depositAmount", e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="item-delivery" className={labelClass}>Teslim Yöntemi</label>
          <select
            id="item-delivery"
            value={values.deliveryMethod}
            onChange={(e) => set("deliveryMethod", e.target.value as DeliveryMethod)}
            className={inputClass}
          >
            {Object.entries(DELIVERY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-city" className={labelClass}>Şehir</label>
          <select
            id="item-city"
            value={values.city}
            onChange={(e) => setValues((v) => ({ ...v, city: e.target.value, district: "" }))}
            className={inputClass}
          >
            <option value="">Seçiniz</option>
            {SORTED_CITIES.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="item-district" className={labelClass}>İlçe</label>
          <select
            id="item-district"
            value={values.district}
            onChange={(e) => set("district", e.target.value)}
            disabled={!values.city}
            className={`${inputClass} disabled:bg-stone-100 disabled:text-stone-400`}
          >
            <option value="">{values.city ? "Seçiniz" : "Önce şehir seç"}</option>
            {districtOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className={labelClass}>Aksesuarlar</label>
          <button type="button" onClick={addAccessory} className="text-xs font-medium text-stone-700 underline">
            + Aksesuar ekle
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {values.accessories.map((accessory, index) => (
            <div key={index} className="flex gap-2">
              <input
                placeholder="Aksesuar adı"
                value={accessory.name}
                onChange={(e) => updateAccessory(index, "name", e.target.value)}
                className={`${inputClass} mt-0 flex-1`}
              />
              <input
                type="number"
                min={1}
                placeholder="Adet"
                value={accessory.quantity}
                onChange={(e) => updateAccessory(index, "quantity", e.target.value)}
                className={`${inputClass} mt-0 w-20`}
              />
              <button
                type="button"
                onClick={() => removeAccessory(index)}
                className="rounded-full border border-stone-300 px-3 text-sm text-stone-500 hover:bg-stone-100"
              >
                Sil
              </button>
            </div>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-full bg-rose-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
        >
          {submitting ? "Kaydediliyor..." : submitLabel}
        </button>
        {secondaryAction && (
          <button
            type="button"
            disabled={submitting}
            onClick={() => secondaryAction.onClick(values)}
            className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    </form>
  );
}
