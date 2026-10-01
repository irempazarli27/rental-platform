"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { activateUser, listAdminUsers, suspendUser } from "@/lib/api/admin";
import type { AuthUser } from "@/lib/api/auth";
import { describeApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [reasonDraft, setReasonDraft] = useState("");

  const load = useCallback(async (query?: string) => {
    setIsLoading(true);
    try {
      const { users, total } = await listAdminUsers({ q: query, pageSize: 50 });
      setUsers(users);
      setTotal(total);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    async function run() {
      await load();
    }
    run();
  }, [load]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    load(q || undefined);
  }

  function openSuspendForm(user: AuthUser) {
    setError(null);
    setReasonDraft("");
    setSuspendingId(user.id);
  }

  async function confirmSuspend(user: AuthUser) {
    if (reasonDraft.trim().length < 3) {
      setError("Askıya alma sebebi en az 3 karakter olmalı.");
      return;
    }
    setBusyId(user.id);
    setError(null);
    try {
      await suspendUser(user.id, reasonDraft.trim());
      setSuspendingId(null);
      await load(q || undefined);
    } catch (err) {
      setError(describeApiError(err, "İşlem başarısız oldu."));
    } finally {
      setBusyId(null);
    }
  }

  async function handleActivate(user: AuthUser) {
    setBusyId(user.id);
    setError(null);
    try {
      await activateUser(user.id);
      await load(q || undefined);
    } catch (err) {
      setError(describeApiError(err, "İşlem başarısız oldu."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-stone-900">Kullanıcılar</h1>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İsim veya e-posta ile ara..."
          className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
        />
        <button type="submit" className="rounded-full bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
          Ara
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="mt-6 text-sm text-stone-500">Yükleniyor...</p>
      ) : (
        <>
          <p className="mt-4 text-xs text-stone-500">{total} kullanıcı</p>
          <div className="mt-2 flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="rounded-2xl border border-stone-200 bg-surface p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-stone-900">{u.fullName}</p>
                      {u.role === "admin" && (
                        <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">admin</span>
                      )}
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-600"
                        }`}
                      >
                        {u.status === "active" ? "Aktif" : "Askıda"}
                      </span>
                    </div>
                    <p className="truncate text-xs text-stone-500">{u.email}</p>
                    <p className="text-xs text-stone-400">Katılım: {formatDate(u.createdAt)}</p>
                  </div>
                  {u.role !== "admin" && (
                    <div className="shrink-0">
                      {u.status === "active" ? (
                        suspendingId === u.id ? (
                          <button
                            onClick={() => setSuspendingId(null)}
                            className="rounded-xl border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100"
                          >
                            Vazgeç
                          </button>
                        ) : (
                          <button
                            disabled={busyId === u.id}
                            onClick={() => openSuspendForm(u)}
                            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            Askıya Al
                          </button>
                        )
                      ) : (
                        <button
                          disabled={busyId === u.id}
                          onClick={() => handleActivate(u)}
                          className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-100 disabled:opacity-50"
                        >
                          Aktifleştir
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {suspendingId === u.id && (
                  <div className="mt-3 flex flex-col gap-2 border-t border-stone-100 pt-3">
                    <label htmlFor={`suspend-reason-${u.id}`} className="text-xs font-medium text-stone-700">
                      Askıya alma sebebi
                    </label>
                    <textarea
                      id={`suspend-reason-${u.id}`}
                      rows={2}
                      value={reasonDraft}
                      onChange={(e) => setReasonDraft(e.target.value)}
                      placeholder="Örn. tekrarlanan kural ihlali, sahte ilan, vb."
                      className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
                    />
                    <button
                      disabled={busyId === u.id}
                      onClick={() => confirmSuspend(u)}
                      className="w-fit rounded-full bg-rose-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {busyId === u.id ? "İşleniyor..." : "Askıya Almayı Onayla"}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
