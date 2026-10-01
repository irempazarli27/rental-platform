"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { useAuth } from "@/context/AuthContext";
import { ApiError } from "@/lib/api/client";

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ fullName, email, password });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Kayıt sırasında bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleCredential(idToken: string) {
    setError(null);
    try {
      await loginWithGoogle(idToken);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Google ile kayıt sırasında bir hata oluştu.");
    }
  }

  return (
    <div className="relative flex w-full flex-1 flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-rose-50 via-stone-50 to-stone-50 px-4 py-16 sm:px-6">
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-rose-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-amber-200/30 blur-3xl" />

      <div className="relative w-full max-w-md rounded-3xl border border-stone-200 bg-surface p-8 shadow-xl shadow-stone-900/5">
        <h1 className="text-2xl font-semibold text-stone-900">Hesap Oluştur</h1>
        <p className="mt-1 text-sm text-stone-600">Eşya kiralamaya veya kiraya vermeye başla.</p>

        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-stone-700">
              Ad Soyad
            </label>
            <input
              id="fullName"
              type="text"
              required
              minLength={2}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-stone-700">
              E-posta
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-stone-700">
              Şifre
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-100"
            />
            <p className="mt-1 text-xs text-stone-500">En az 8 karakter.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {isSubmitting ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>

        {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
          <>
            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-stone-200" />
              <span className="text-xs text-stone-500">veya</span>
              <div className="h-px flex-1 bg-stone-200" />
            </div>

            <div className="mt-4">
              <GoogleSignInButton onCredential={handleGoogleCredential} />
            </div>
          </>
        )}

        <p className="mt-6 text-sm text-stone-600">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="font-medium text-rose-600 hover:text-rose-700">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}
