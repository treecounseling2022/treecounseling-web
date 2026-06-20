import { google } from "googleapis";

function getCalendarClient() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!keyJson) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON not set");

  const key = JSON.parse(keyJson);
  const auth = new google.auth.GoogleAuth({
    credentials: key,
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });
  return google.calendar({ version: "v3", auth });
}

// Mask middle character(s) of a name for privacy
// "陳大文" → "陳O文"  |  "陳大" → "陳O"  |  "陳" → "陳"
export function maskClientName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "O";
  return name[0] + "O" + name[name.length - 1];
}

interface CalendarEventInput {
  summary: string;
  startIso: string;      // ISO 8601
  durationMinutes: number;
  description?: string;
  timeZone?: string;
}

export async function createCalendarEvent(
  calendarId: string,
  event: CalendarEventInput
): Promise<string> {
  const cal = getCalendarClient();
  const tz = event.timeZone ?? "Asia/Macau";

  const start = new Date(event.startIso);
  const end = new Date(start.getTime() + event.durationMinutes * 60 * 1000);

  const { data } = await cal.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: start.toISOString(), timeZone: tz },
      end:   { dateTime: end.toISOString(),   timeZone: tz },
    },
  });

  if (!data.id) throw new Error("Calendar event created but no ID returned");
  return data.id;
}

export async function updateCalendarEvent(
  calendarId: string,
  eventId: string,
  event: CalendarEventInput
): Promise<void> {
  const cal = getCalendarClient();
  const tz = event.timeZone ?? "Asia/Macau";

  const start = new Date(event.startIso);
  const end = new Date(start.getTime() + event.durationMinutes * 60 * 1000);

  await cal.events.patch({
    calendarId,
    eventId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: start.toISOString(), timeZone: tz },
      end:   { dateTime: end.toISOString(),   timeZone: tz },
    },
  });
}

export async function deleteCalendarEvent(
  calendarId: string,
  eventId: string
): Promise<void> {
  const cal = getCalendarClient();
  await cal.events.delete({ calendarId, eventId });
}
