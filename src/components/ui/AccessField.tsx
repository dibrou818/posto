import { ACCESS_OPTIONS } from "@/lib/access";

/** "Accès" picker shared by the event and activity forms: three options as
 * radio pills, plus "Non précisé" so nothing is claimed by default (an
 * unspecified access shows nothing publicly — better than a wrong "entrée
 * libre"). Posts `access` ("" when unspecified). */
export function AccessField({
  name = "access",
  label = "Accès",
  defaultValue,
  idPrefix,
}: {
  name?: string;
  label?: string;
  defaultValue?: string | null;
  idPrefix: string;
}) {
  const current = defaultValue ?? "";
  const options = [...ACCESS_OPTIONS, { value: "", label: "Non précisé", hint: "" }];

  return (
    <fieldset>
      <legend className="mb-1.5 block text-sm font-medium text-gray-700">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const id = `${idPrefix}-${option.value || "none"}`;
          return (
            <label
              key={option.value || "none"}
              htmlFor={id}
              title={option.hint || undefined}
              className="cursor-pointer"
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                defaultChecked={current === option.value}
                className="peer sr-only"
              />
              <span className="inline-flex min-h-10 items-center rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 peer-checked:border-gray-900 peer-checked:bg-gray-900 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-gray-900/30">
                {option.label}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
