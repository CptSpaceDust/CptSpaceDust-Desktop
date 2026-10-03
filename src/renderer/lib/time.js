const COMMUNITY_TIME_ZONE = "America/Denver";

function partsInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function communityDateTime(dateValue, timeValue = "00:00") {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  const [hour, minute, second = 0] = String(timeValue).split(":").map(Number);
  const intended = Date.UTC(year, month - 1, day, hour, minute, second);
  let candidate = intended;

  // Intl can format in an IANA zone but cannot parse one. Two corrections are
  // enough to resolve both standard and daylight-saving offsets.
  for (let pass = 0; pass < 2; pass += 1) {
    const shown = partsInTimeZone(new Date(candidate), COMMUNITY_TIME_ZONE);
    const represented = Date.UTC(
      Number(shown.year),
      Number(shown.month) - 1,
      Number(shown.day),
      Number(shown.hour),
      Number(shown.minute),
      Number(shown.second),
    );
    candidate += intended - represented;
  }
  return new Date(candidate);
}

export function localTimeZoneName() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "your local time";
}

export function formatMeetupLocal(dateValue, timeValue, options = {}) {
  return communityDateTime(dateValue, timeValue).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    ...options,
  });
}
