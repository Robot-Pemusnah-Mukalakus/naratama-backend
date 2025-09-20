export function generateTimestampCode() {
  return Date.now().toString(36).toUpperCase();
}
