import type { ButtonHTMLAttributes } from "react";
import { buttonClass } from "@/lib/ui";

type ButtonProps = {
  size?: "default" | "compact";
} & ButtonHTMLAttributes<HTMLButtonElement>;

/** Primary (dark) submit/action button. Use `className` for one-off layout
 * modifiers (e.g. "self-start") — see {@link buttonClass}. */
export function Button({ size = "default", className = "", ...props }: ButtonProps) {
  return <button className={buttonClass(size, className)} {...props} />;
}
