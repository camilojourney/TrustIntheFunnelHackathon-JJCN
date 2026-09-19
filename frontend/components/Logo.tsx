import { cx } from "@/lib/cx";

// The same leaf badge is app/icon.svg. Its colors stay fixed in both themes;
// only the word follows the text color.
export function Logo({
  className = "",
  printView = false,
}: {
  className?: string;
  printView?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 leading-none ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width={24}
        height={24}
        aria-hidden="true"
        className="block h-6 w-6 shrink-0 [print-color-adjust:exact]"
      >
        <rect width="32" height="32" rx="8" fill="#047857" />
        <path d="M8.5 23.5C8.5 14 14 8.5 23.5 8.5c0 9.5-5.5 15-15 15Z" fill="#fff" />
        <path
          d="M8.5 23.5L18 14"
          stroke="#047857"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span className={cx("text-lg font-semibold leading-none tracking-tight text-slate-900", !printView && "dark:text-slate-100")}>
        Sage
      </span>
    </span>
  );
}
