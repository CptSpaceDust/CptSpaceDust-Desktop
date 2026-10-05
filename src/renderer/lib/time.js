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

export function zonedDateTime(
  dateValue,
  timeValue = "00:00",
  timeZone = localTimeZoneName(),
) {
  const [year, month, day] = String(dateValue).split("-").map(Number);
  const [hour, minute, second = 0] = String(timeValue).split(":").map(Number);
  const intended = Date.UTC(year, month - 1, day, hour, minute, second);
  let candidate = intended;

  // Intl can format in an IANA zone but cannot parse one. Two corrections are
  // enough to resolve both standard and daylight-saving offsets.
  for (let pass = 0; pass < 2; pass += 1) {
    const shown = partsInTimeZone(new Date(candidate), timeZone);
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

export function communityDateTime(dateValue, timeValue = "00:00") {
  return zonedDateTime(dateValue, timeValue, COMMUNITY_TIME_ZONE);
}

export function localTimeZoneName() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

export function meetupInstant(item) {
  return zonedDateTime(
    item.meetup_date,
    item.start_time,
    item.time_zone || COMMUNITY_TIME_ZONE,
  );
}

export function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function meetupLocalDateKey(item) {
  return localDateKey(meetupInstant(item));
}

export function availabilityInstantRange(item) {
  const timeZone = item.time_zone || COMMUNITY_TIME_ZONE;
  const start = zonedDateTime(
    item.block_date,
    item.all_day ? "00:00" : item.start_time,
    timeZone,
  );
  if (item.indefinite) return [start, new Date(8640000000000000)];
  if (!item.all_day) {
    return [start, zonedDateTime(item.block_date, item.end_time, timeZone)];
  }
  const [year, month, day] = item.block_date.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1))
    .toISOString()
    .slice(0, 10);
  return [start, zonedDateTime(nextDate, "00:00", timeZone)];
}

export function localDayRange(dateValue) {
  const start = new Date(`${dateValue}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return [start, end];
}

export function formatMeetupLocal(
  dateValue,
  timeValue,
  timeZone = COMMUNITY_TIME_ZONE,
  options = {},
) {
  return zonedDateTime(dateValue, timeValue, timeZone).toLocaleString(
    undefined,
    {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      ...options,
    },
  );
}
