// Serialize JSON-LD for embedding in a <script> tag. JSON.stringify alone is
// NOT safe there: a value containing "</script>" (e.g. a hostile store name
// arriving via import or admin entry) would terminate the script element and
// inject markup. Escape the characters HTML cares about as JSON unicode
// escapes, which JSON-LD parsers decode transparently.
export function jsonLdString(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
