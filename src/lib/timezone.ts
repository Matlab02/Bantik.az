import { env } from "./env";

const offsetPattern = /(Z|[+-]\d{2}:\d{2})$/i;

function offsetAt(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const representedAsUtc = Date.UTC(
    Number(value.year),
    Number(value.month) - 1,
    Number(value.day),
    Number(value.hour),
    Number(value.minute),
    Number(value.second),
  );
  return representedAsUtc - instant.getTime();
}

export function parseScheduledDate(
  value?: string | null,
  timeZone = env.APP_TIMEZONE,
) {
  if (!value) return null;
  if (offsetPattern.test(value)) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) throw new Error("INVALID_SCHEDULE_DATE");
    return parsed;
  }
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) throw new Error("INVALID_SCHEDULE_DATE");
  const guess = new Date(
    Date.UTC(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] || 0),
    ),
  );
  let result = new Date(guess.getTime() - offsetAt(guess, timeZone));
  result = new Date(guess.getTime() - offsetAt(result, timeZone));
  return result;
}
