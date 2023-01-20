// This normalize function normalizes the path returned across OS
export function normalizePath(path: string) {
  return path.replace(/\\/g, "/");
}
