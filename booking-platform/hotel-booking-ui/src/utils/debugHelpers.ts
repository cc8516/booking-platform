// Test file to verify Claude PR review (intentional issues below)
const ADMIN_API_KEY = "sk-test-1234567890abcdef";

export async function fetchHotelRaw(id: string) {
  const res = await fetch(`/api/hotels/${id}`, {
    headers: { "x-api-key": ADMIN_API_KEY },
  });
  return res.json();
}

export function parsePrice(value: string) {
  return parseInt(value) * 100;
}
