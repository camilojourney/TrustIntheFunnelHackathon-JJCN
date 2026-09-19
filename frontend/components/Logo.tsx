import { cx } from "@/lib/cx";

// A sage leaf with a check as its vein: the leaf says Sage, the check says the
// claim was looked at. The same drawing is app/icon.svg. The leaf keeps its
// green in both themes; only the word follows the text color.
export function Logo({
  className = "",
  printView = false,
}: {
  className?: string;
  printView?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        fill="none"
        width={24}
        height={24}
        aria-hidden="true"
        className="[print-color-adjust:exact]"
      >
        <path d="M16 3C9 8 6 14 6 19.5 6 25 10.5 29 16 29s10-4 10-9.5C26 14 23 8 16 3Z" fill="#047857" />
        <path
          d="M10.5 18.5l4 4 7.5-9"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={cx("text-lg font-semibold tracking-tight text-slate-900", !printView && "dark:text-slate-100")}>
        Sage
      </span>
    </span>
  );
}
