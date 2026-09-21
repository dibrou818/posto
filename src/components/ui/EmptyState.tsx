import Link from "next/link";
import { buttonClass } from "@/lib/ui";

export function EmptyState({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return <div className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center">
    <h2 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">{description}</p>
    <Link href={href} className={buttonClass("default", "mt-5")}>{action}</Link>
  </div>;
}
