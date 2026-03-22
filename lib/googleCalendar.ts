import { google } from "googleapis";
import { ClientConfig } from "@/types";
import { addDays, format, setHours, setMinutes, addMinutes, isBefore, isAfter, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

function getCalendarClient() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error("Missing Google Calendar credentials in .env.local");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: privateKey },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

export interface AvailableSlot {
  date:     string;
  time:     string;
  isoStart: string;
  isoEnd:   string;
}

// ================================================
// GET SERVICE DURATION
// ================================================
export function getServiceDuration(config: ClientConfig, service: string): number {
  if (config.serviceDurations) {
    if (config.serviceDurations[service]) return config.serviceDurations[service];
    for (const [key, duration] of Object.entries(config.serviceDurations)) {
      if (
        service.toLowerCase().includes(key.toLowerCase()) ||
        key.toLowerCase().includes(service.toLowerCase())
      ) {
        return duration;
      }
    }
  }
  return config.appointmentDuration ?? 60;
}

// ================================================
// GET AVAILABLE SLOTS
// ================================================
export async function getAvailableSlots(
  config: ClientConfig,
  daysAhead = 5
): Promise<AvailableSlot[]> {

  if (!config.googleCalendarId || !config.workingHours) {
    console.warn(`No calendar configured for ${config.id} — using mock slots`);
    return getMockSlots(config);
  }

  try {
    const calendar   = getCalendarClient();
    const timezone   = config.timezone ?? "Australia/Melbourne";
    const duration   = config.appointmentDuration ?? 60;
    const calendarId = config.googleCalendarId;

    const now       = new Date();
    const windowEnd = addDays(now, daysAhead + 4);

    const freebusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin:  now.toISOString(),
        timeMax:  windowEnd.toISOString(),
        timeZone: timezone,
        items:    [{ id: calendarId }],
      },
    });

    const busyBlocks = freebusyRes.data.calendars?.[calendarId]?.busy ?? [];

    const slots: AvailableSlot[] = [];
    let daysCounted = 0;
    let cursor      = addDays(now, 1);

    while (daysCounted < daysAhead) {
      const dayName = format(cursor, "EEEE").toLowerCase() as keyof typeof config.workingHours;
      const hours   = config.workingHours?.[dayName];

      if (hours && typeof hours === "object" && "open" in hours) {
        const h = hours as { open: string; close: string };
        const [openH,  openM]  = h.open.split(":").map(Number);
        const [closeH, closeM] = h.close.split(":").map(Number);

        // Build times in clinic timezone using date string
        // This prevents the UTC offset bug on Vercel servers
        const dateStr  = format(cursor, "yyyy-MM-dd");
        const openStr  = `${dateStr}T${String(openH).padStart(2, "0")}:${String(openM).padStart(2, "0")}:00`;
        const closeStr = `${dateStr}T${String(closeH).padStart(2, "0")}:${String(closeM).padStart(2, "0")}:00`;

        let slotStartUtc  = fromZonedTime(new Date(openStr), timezone);
        const dayEndUtc   = fromZonedTime(new Date(closeStr), timezone);

        while (
          isBefore(addMinutes(slotStartUtc, duration), dayEndUtc) ||
          +addMinutes(slotStartUtc, duration) === +dayEndUtc
        ) {
          const slotEndUtc = addMinutes(slotStartUtc, duration);

          if (isAfter(slotStartUtc, now)) {
            const overlaps = busyBlocks.some((block: any) => {
              const blockStart = parseISO(block.start);
              const blockEnd   = parseISO(block.end);
              return (
                isBefore(slotStartUtc, blockEnd) &&
                isAfter(slotEndUtc, blockStart)
              );
            });

            if (!overlaps) {
              // Convert back to clinic timezone for display
              const slotStartLocal = toZonedTime(slotStartUtc, timezone);
              slots.push({
                date:     format(cursor, "EEEE d MMM"),
                time:     format(slotStartLocal, "h:mm a"),
                isoStart: slotStartUtc.toISOString(),
                isoEnd:   slotEndUtc.toISOString(),
              });
            }
          }

          slotStartUtc = addMinutes(slotStartUtc, duration);
        }

        daysCounted++;
      }

      cursor = addDays(cursor, 1);
      if (daysCounted === 0 && +cursor > +addDays(now, 30)) break;
    }

    return slots.slice(0, 6);

  } catch (err) {
    console.error("Google Calendar error:", err);
    return getMockSlots(config);
  }
}

// ================================================
// BOOK APPOINTMENT
// ================================================
export async function bookAppointment(params: {
  config:       ClientConfig;
  patientName:  string;
  patientPhone: string;
  service:      string;
  isoStart:     string;
  isoEnd:       string;
}): Promise<{ eventId: string; htmlLink: string } | null> {

  if (!params.config.googleCalendarId) {
    console.warn("No calendar configured — appointment not booked");
    return null;
  }

  try {
    const calendar   = getCalendarClient();
    const calendarId = params.config.googleCalendarId;
    const timezone   = params.config.timezone ?? "Australia/Melbourne";

    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary:     `${params.service} — ${params.patientName}`,
        description: `Patient: ${params.patientName}\nPhone: ${params.patientPhone}\nService: ${params.service}\n\nBooked via ChatFlow AI`,
        start: { dateTime: params.isoStart, timeZone: timezone },
        end:   { dateTime: params.isoEnd,   timeZone: timezone },
        colorId: "2",
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 },
            { method: "popup", minutes: 60 },
          ],
        },
      },
    });

    return {
      eventId:  event.data.id ?? "",
      htmlLink: event.data.htmlLink ?? "",
    };

  } catch (err) {
    console.error("Failed to book appointment:", err);
    return null;
  }
}

// ================================================
// CANCEL APPOINTMENT
// ================================================
export async function cancelAppointment(params: {
  config:      ClientConfig;
  patientName: string;
  isoStart?:   string;
}): Promise<boolean> {

  if (!params.config.googleCalendarId) return false;

  try {
    const calendar   = getCalendarClient();
    const calendarId = params.config.googleCalendarId;
    const now        = new Date();
    const future     = addDays(now, 30);

    const eventsRes = await calendar.events.list({
      calendarId,
      timeMin:      params.isoStart ?? now.toISOString(),
      timeMax:      future.toISOString(),
      q:            params.patientName,
      singleEvents: true,
      orderBy:      "startTime",
    });

    const events = eventsRes.data.items ?? [];
    const match  = events.find(e =>
      e.summary?.toLowerCase().includes(params.patientName.toLowerCase())
    );

    if (!match?.id) {
      console.log(`[Cancel] No event found for ${params.patientName}`);
      return false;
    }

    await calendar.events.delete({ calendarId, eventId: match.id });
    console.log(`[Cancel] Deleted: ${match.summary}`);
    return true;

  } catch (err) {
    console.error("[Cancel] Failed:", err);
    return false;
  }
}

// ================================================
// MOCK SLOTS FALLBACK
// ================================================
function getMockSlots(config: ClientConfig): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const duration = config.appointmentDuration ?? 60;
  let cursor = addDays(new Date(), 1);
  let count  = 0;

  while (count < 6) {
    const dayName = format(cursor, "EEEE").toLowerCase() as keyof typeof config.workingHours;
    const hours   = config.workingHours?.[dayName];

    if (hours && typeof hours === "object" && "open" in hours) {
      const [openH, openM] = (hours as { open: string; close: string }).open.split(":").map(Number);
      const times = [
        setMinutes(setHours(new Date(cursor), openH), openM),
        addMinutes(setMinutes(setHours(new Date(cursor), openH), openM), duration * 2),
      ];
      for (const t of times) {
        if (count >= 6) break;
        slots.push({
          date:     format(cursor, "EEEE d MMM"),
          time:     format(t, "h:mm a"),
          isoStart: t.toISOString(),
          isoEnd:   addMinutes(t, duration).toISOString(),
        });
        count++;
      }
    }
    cursor = addDays(cursor, 1);
    if (+cursor > +addDays(new Date(), 30)) break;
  }
  return slots;
}