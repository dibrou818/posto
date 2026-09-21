"use client";
import Link from "next/link";
import { buttonClass } from "@/lib/ui";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="posto-page flex flex-1 flex-col items-center justify-center text-center">
    <p className="text-sm font-semibold text-gray-500">Posto</p>
    <h1 className="posto-title mt-3">Impossible de charger cette page</h1>
    <p className="mt-3 max-w-md text-gray-600">Vérifiez votre connexion et réessayez. Vos informations enregistrées sont conservées.</p>
    <button className={buttonClass("default", "mt-6")} onClick={reset}>Réessayer</button>
    <Link className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4" href="/">Revenir à la découverte</Link>
  </div>;
}
