import { google } from "googleapis";
import { ClientConfig } from "@/types";
import { addDays, format, parse, isWeekend, setHours, setMinutes, addMinutes, isBefore, isAfter, parseISO } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

// ================================================
// GOOGLE CALENDAR INTEGRATION
// ------------------------------------------------
// Per-client calendar access using a single
// service account. Each clinic shares their
// calendar with the service account email.
// ================================================

// ⚠️ Add to .env.local:
// GOOGLE_SERVICE_ACCOUNT_EMAIL=chatflow@project.iam.gserviceaccount.com
// GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

function getCalendarClient() {
  const email      = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!email || !privateKey) {
    throw new Error("Missing Google Calendar credentials in .env.local");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key:  privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/calendar"],
  });

  return google.calendar({ version: "v3", auth });
}

// ================================================
// GET AVAILABLE SLOTS
// ------------------------------------------------
// 1. Generate all possible slots within working hours
//    for the next 5 working days
// 2. Call freebusy API to get blocked times
// 3. Return slots that don't overlap with busy blocks
// ================================================

export interface AvailableSlot {
  date:      string;   // "Monday 23 Jun"
  time:      string;   // "10:00 AM"
  isoStart:  string;   // ISO string for booking
  isoEnd:    string;
}

export async function getAvailableSlots(
  config: ClientConfig,
  daysAhead = 5
): Promise<AvailableSlot[]> {

  if (!config.googleCalendarId || !config.workingHours) {
    // Fall back to mock slots if calendar not configured
    console.warn(`No calendar configured for ${config.id} — using mock slots`);
    return getMockSlots(config);
  }

  try {
    const calendar         = getCalendarClient();
    const timezone         = config.timezone ?? "Australia/Melbourne";
    const duration         = config.appointmentDuration ?? 60;
    const calendarId       = config.googleCalendarId;

    // Build time window — now until daysAhead working days from now
    const now       = new Date();
    const windowEnd = addDays(now, daysAhead + 4); // +4 buffer for weekends

    // Get busy blocks from Google Calendar
    const freebusyRes = await calendar.freebusy.query({
      requestBody: {
        timeMin:  now.toISOString(),
        timeMax:  windowEnd.toISOString(),
        timeZone: timezone,
        items:    [{ id: calendarId }],
      },
    });

    const busyBlocks = freebusyRes.data.calendars?.[calendarId]?.busy ?? [];

    // Generate candidate slots across working days
    const slots: AvailableSlot[] = [];
    let   daysCounted = 0;
    let   cursor      = addDays(now, 1); // start from tomorrow

    while (daysCounted < daysAhead) {
      const dayName = format(cursor, "EEEE").toLowerCase() as keyof typeof config.workingHours;
      const hours   = config.workingHours?.[dayName];

      if (hours) {
        // Generate slots for this day
        const h = hours as { open: string; close: string };
        const [openH,  openM]  = h.open.split(":").map(Number);
        const [closeH, closeM] = h.close.split(":").map(Number);

        let slotStart = setMinutes(setHours(new Date(cursor), openH), openM);
        const dayEnd  = setMinutes(setHours(new Date(cursor), closeH), closeM);

        while (isBefore(addMinutes(slotStart, duration), dayEnd) ||
               +addMinutes(slotStart, duration) === +dayEnd) {

          const slotEnd = addMinutes(slotStart, duration);

          // Convert to UTC for comparison with Google's busy blocks
          const slotStartUtc = fromZonedTime(slotStart, timezone);
          const slotEndUtc   = fromZonedTime(slotEnd, timezone);

          // Skip slots in the past
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
              slots.push({
                date:     format(cursor, "EEEE d MMM"),
                time:     format(slotStart, "h:mm a"),
                isoStart: slotStartUtc.toISOString(),
                isoEnd:   slotEndUtc.toISOString(),
              });
            }
          }

          slotStart = addMinutes(slotStart, duration);
        }

        daysCounted++;
      }

      cursor = addDays(cursor, 1);

      // Safety valve — don't loop forever
      if (daysCounted === 0 && +cursor > +addDays(now, 30)) break;
    }

    // Return first 6 available slots
    return slots.slice(0, 6);

  } catch (err) {
    console.error("Google Calendar error:", err);
    // Fall back to mock slots on error
    return getMockSlots(config);
  }
}

// ================================================
// BOOK APPOINTMENT
// ------------------------------------------------
// Creates a calendar event in the clinic's calendar
// with patient details in the event description.
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
    console.warn("No calendar configured — appointment not booked in calendar");
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
        start: {
          dateTime: params.isoStart,
          timeZone: timezone,
        },
        end: {
          dateTime: params.isoEnd,
          timeZone: timezone,
        },
        // Colour the event so clinic staff can spot chatbot bookings
        colorId: "2", // sage green
        reminders: {
          useDefault: false,
          overrides: [
            { method: "email", minutes: 24 * 60 }, // 24hr email reminder
            { method: "popup", minutes: 60 },       // 1hr popup reminder
          ],
        },
      },
    });

    return {
      eventId:  event.data.id ?? "",
      htmlLink: event.data.htmlLink ?? "",
    };

  } catch (err) {
    console.error("Failed to book appointment in Google Calendar:", err);
    return null;
  }
}

// ================================================
// MOCK SLOTS FALLBACK
// Used when no calendar is configured or on error
// ================================================

function getMockSlots(config: ClientConfig): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  const duration = config.appointmentDuration ?? 60;
  let   cursor   = addDays(new Date(), 1);
  let   count    = 0;

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