"use client";

import { useState, type FormEvent } from "react";
import { deleteAccount, type AuthUser } from "@/lib/api/auth";
import { describeApiError } from "@/lib/api/client";

const inputClass =
  "mt-1 w-full rounded-xl border border-stone-300 bg-surface px-3 py-2 text-sm text-stone-900 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100";

export function DeleteAccountSection({ user }: { user: AuthUser }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(user.hasPassword ? { password: value } : { confirmEmail: value });
      // A full page load rather than logout() + client navigation: clearing the
      // session first would let the dashboard's "signed out -> /login" redirect
      // win the race. The server has already revoked the stored refresh token,
      // so the fresh page finds it dead and clears it on its own.
      window.location.replace("/account-deleted");
    } catch (err) {
      setError(describeApiError(err, "Hesap silinemedi."));
      setBusy(false);
    }
  }

  // Deliberately quiet: a small link at the end of Settings, not a red panel.
  // The warning and the confirmation only appear once someone asks for them.
  if (!open) {
    return (
      <div className="mt-10 text-center">
        <button onClick={() => setOpen(true)} className="text-xs text-stone-500 underline-offset-2 hover:text-stone-700 hover:underline">
          Hesabımı sil
        </button>
      </div>
    );
  }

  return (
    <section className="mt-10 rounded-2xl border border-stone-200 bg-surface p-5">
      <h2 className="text-sm font-semibold text-stone-900">Hesabı sil</h2>
      <p className="mt-1 text-xs text-stone-600">
        Adın, e-postan, telefonun ve profil bilgilerin kalıcı olarak silinir, ilanların yayından kaldırılır. Geçmiş
        kiralamaların, mesajların ve yorumların karşı tarafın kayıtları olarak &ldquo;Silinmiş kullanıcı&rdquo; adıyla
        kalır. Bu işlem geri alınamaz.
      </p>

      <form onSubmit={handleDelete} className="mt-4">
        <label htmlFor="delete-confirm" className="block text-xs font-medium text-stone-700">
          {user.hasPassword ? "Onaylamak için şifreni gir" : `Onaylamak için e-posta adresini yaz (${user.email})`}
        </label>
        <input
          id="delete-confirm"
          type={user.hasPassword ? "password" : "email"}
          autoComplete={user.hasPassword ? "current-password" : "off"}
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={busy || !value}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? "Siliniyor..." : "Hesabımı kalıcı olarak sil"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setValue("");
              setError(null);
            }}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Vazgeç
          </button>
        </div>
      </form>
    </section>
  );
}
