// Join class names and drop the falsy ones. A component that also renders in
// the print view passes `false` for its dark: classes, so a printed page
// carries none of them and its markup stays byte-for-byte what it was.
export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}
