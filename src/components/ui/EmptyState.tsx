import Link from "next/link";
import { buttonClass } from "@/lib/ui";

export function EmptyState({ title, description, href, action }: { title: string; description: string; href: string; action: string }) {
  return <div className="rounded-2xl bg-gray-50 px-6 py-10 text-center">
    <h2 className="posto-heading text-lg text-gray-900">{title}</h2>
    <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-gray-600">{description}</p>
    <Link href={href} className={buttonClass("default", "mt-5")}>{action}</Link>
  </div>;
}
