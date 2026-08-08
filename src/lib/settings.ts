export function resolveWhatsappNumber(
  configured?: string | null,
  fallback = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
) {
  return (configured?.trim() || fallback.trim()).replace(/\D/g, "");
}
