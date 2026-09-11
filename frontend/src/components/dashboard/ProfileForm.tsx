"use client";

import { useState, type FormEvent } from "react";
import type { AuthUser } from "@/lib/api/auth";
import { updateMe } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";

export function ProfileForm({ user, onSaved }: { user: AuthUser; onSaved: () => Promise<void> }) {
  const [bio, setBio] = useState(user.bio ?? "");
  const [city, setCity] = useState(user.city ?? "");
  const [district, setDistrict] = useState(user.district ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    setSaveError(null);
    setSaved(false);
    setIsSaving(true);
    try {
      await updateMe({ bio: bio || null, city: city || null, district: district || null });
      await onSaved();
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
      <div>
        <label htmlFor="bio" className="block text-xs font-medium text-stone-700">
          Hakkımda
        </label>
        <textarea
          id="bio"
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="city" className="block text-xs font-medium text-stone-700">
            Şehir
          </label>
          <input
            id="city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
        </div>
        <div>
          <label htmlFor="district" className="block text-xs font-medium text-stone-700">
            İlçe
          </label>
          <input
            id="district"
            type="text"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
          />
        </div>
      </div>

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      {saved && <p className="text-sm text-emerald-600">Kaydedildi.</p>}

      <button
        type="submit"
        disabled={isSaving}
        className="mt-1 self-start rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
      >
        {isSaving ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
