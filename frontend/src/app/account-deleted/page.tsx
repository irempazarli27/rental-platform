import Link from "next/link";

export default function AccountDeletedPage() {
  return (
    <div className="mx-auto w-full max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold text-stone-900">Hesabın silindi</h1>
      <p className="mt-3 text-sm text-stone-600">
        Kişisel bilgilerin silindi ve oturumun kapatıldı. Dilersen aynı e-posta adresiyle yeniden kayıt olabilirsin.
      </p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-rose-600 px-5 py-2 text-sm font-medium text-white hover:bg-rose-700">
        Ana sayfaya dön
      </Link>
    </div>
  );
}
