import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { inputClass, labelClass } from "@/lib/ui";

type TextFieldProps = { label: string } & InputHTMLAttributes<HTMLInputElement>;

/** Labeled text input, styled consistently across every form in the app. */
export function TextField({ label, className = "", ...props }: TextFieldProps) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <input className={`${inputClass} ${className}`.trim()} {...props} />
    </div>
  );
}

type TextareaFieldProps = { label: string } & TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Labeled textarea, same visual style as {@link TextField}. */
export function TextareaField({ label, className = "", ...props }: TextareaFieldProps) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <textarea className={`${inputClass} ${className}`.trim()} {...props} />
    </div>
  );
}
