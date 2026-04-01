"use client";

/**
 * Read-only text field + on-screen keypad so mobile users can enter decimals (e.g. 0.01).
 */
export function DecimalPercentInput({
  value,
  onChange,
  disabled,
  placeholder = "0.01",
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const append = (ch: string) => {
    if (disabled) return;
    if (ch === ".") {
      if (value.includes(".")) return;
      if (value === "") {
        onChange("0.");
        return;
      }
      onChange(`${value}.`);
      return;
    }
    if (ch >= "0" && ch <= "9") {
      const next = value + ch;
      const parts = next.split(".");
      if (parts[1] && parts[1].length > 2) return;
      if (parts[0] && parts[0].length > 6) return;
      onChange(next);
    }
  };

  const backspace = () => {
    if (disabled) return;
    onChange(value.slice(0, -1));
  };

  const clear = () => {
    if (disabled) return;
    onChange("");
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <input
        type="text"
        readOnly
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-500"
      />
      <div
        className="grid grid-cols-3 gap-2 select-none"
        aria-hidden
      >
        {(["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const).map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => append(d)}
            className="rounded-lg border border-gray-200 bg-gray-50 py-3 text-lg font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          onClick={() => append(".")}
          className="rounded-lg border border-gray-200 bg-gray-50 py-3 text-lg font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
        >
          .
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => append("0")}
          className="rounded-lg border border-gray-200 bg-gray-50 py-3 text-lg font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={backspace}
          className="rounded-lg border border-gray-200 bg-amber-50 py-3 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          退格
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={clear}
          className="col-span-3 rounded-lg border border-gray-200 bg-white py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          清除
        </button>
      </div>
    </div>
  );
}
