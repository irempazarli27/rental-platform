"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { activateUser, listAdminUsers, suspendUser } from "@/lib/api/admin";
import type { AuthUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { formatDate } from "@/lib/format";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSuspend(user: AuthUser) {
    const reason = window.prompt(`"${user.fullName}" kullanıcısını neden askıya alıyorsun?`);
    if (!reason) return;
    setBusyId(user.id);
    setError(null);
    try {
      await suspendUser(user.id, reason);
      await load(q || undefined);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "İşlem başarısız oldu.");
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
      setError(err instanceof ApiError ? err.message : "İşlem başarısız oldu.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-900">Kullanıcılar</h1>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İsim veya e-posta ile ara..."
          className="flex-1 rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
        />
        <button type="submit" className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800">
          Ara
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {isLoading ? (
        <p className="mt-6 text-sm text-zinc-500">Yükleniyor...</p>
      ) : (
        <>
          <p className="mt-4 text-xs text-zinc-500">{total} kullanıcı</p>
          <div className="mt-2 flex flex-col gap-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white p-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-zinc-900">{u.fullName}</p>
                    {u.role === "admin" && (
                      <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-600">admin</span>
                    )}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        u.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {u.status === "active" ? "Aktif" : "Askıda"}
                    </span>
                  </div>
                  <p className="truncate text-xs text-zinc-500">{u.email}</p>
                  <p className="text-xs text-zinc-400">Katılım: {formatDate(u.createdAt)}</p>
                </div>
                {u.role !== "admin" && (
                  <div className="shrink-0">
                    {u.status === "active" ? (
                      <button
                        disabled={busyId === u.id}
                        onClick={() => handleSuspend(u)}
                        className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Askıya Al
                      </button>
                    ) : (
                      <button
                        disabled={busyId === u.id}
                        onClick={() => handleActivate(u)}
                        className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                      >
                        Aktifleştir
                      </button>
                    )}
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
