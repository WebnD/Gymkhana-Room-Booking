// ==============================================================================
// Calendar & Date Time Utility Functions
// Gymkhana Room Booking System (IIT Bhubaneswar)
// ==============================================================================

import { Booking } from "./config";

// Get local date object at midnight
export function getStartOfDay(d: Date = new Date()): Date {
  const res = new Date(d);
  res.setHours(0, 0, 0, 0);
  return res;
}

// Add days to a Date object
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Format date to YYYY-MM-DD
export function formatDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Display date string (e.g. "Oct 24, 2024")
export function formatDisplayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatFullDayDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Short day name and day number
export interface DayHeader {
  date: Date;
  dateKey: string;
  dayName: string; // "THU"
  dayNum: string;  // "24"
  isToday: boolean;
  displayLabel: string;
  bookingCount?: number;
}

export function getRolling7Days(startDate: Date = new Date(), bookings: Booking[] = []): DayHeader[] {
  const base = getStartOfDay(startDate);
  const todayKey = formatDateKey(new Date());
  const days: DayHeader[] = [];

  for (let i = 0; i < 7; i++) {
    const d = addDays(base, i);
    const dateKey = formatDateKey(d);

    // Count bookings for this day
    const dayStartMs = getStartOfDay(d).getTime() + 9 * 60 * 60 * 1000;
    const dayEndMs = getStartOfDay(d).getTime() + 27 * 60 * 60 * 1000;
    const count = bookings.filter((b) => {
      if (b.status !== "booked") return false;
      const bStart = new Date(b.starts_at).getTime();
      const bEnd = new Date(b.ends_at).getTime();
      return bEnd > dayStartMs && bStart < dayEndMs;
    }).length;

    days.push({
      date: d,
      dateKey,
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      dayNum: d.getDate().toString().padStart(2, "0"),
      isToday: dateKey === todayKey,
      displayLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      bookingCount: count,
    });
  }

  return days;
}

export function formatTimeOnly(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// 1-hour slot representation for a selected day (Total 18 slots)
export interface DaySlotItem {
  slotId: string;
  startMinuteOffset: number; // 540 (9AM) to 1560 (2AM next day)
  endMinuteOffset: number;   // 600 (10AM) to 1620 (3AM next day)
  startTimeLabel: string;    // "09:00 AM", "11:00 PM"
  endTimeLabel: string;      // "10:00 AM", "12:00 AM"
  periodCategory: "morning" | "afternoon" | "evening" | "night";
  isBooked: boolean;
  booking?: Booking;
  isMine: boolean;
}

export function getDaySlotItems(
  dayDate: Date,
  bookings: Booking[],
  currentUserEmail?: string | null
): DaySlotItem[] {
  const dayStart = getStartOfDay(dayDate);
  const operatingStartMs = dayStart.getTime() + 9 * 60 * 60 * 1000; // 9:00 AM

  // Active bookings on this day
  const dayBookings = bookings.filter((b) => {
    if (b.status !== "booked") return false;
    const bStart = new Date(b.starts_at).getTime();
    const bEnd = new Date(b.ends_at).getTime();
    const dayEndMs = operatingStartMs + 18 * 60 * 60 * 1000;
    return bEnd > operatingStartMs && bStart < dayEndMs;
  });

  const slots: DaySlotItem[] = [];

  // 1-hour intervals: 9:00 AM (540m) to 3:00 AM (+1 day, 1620m) -> 18 slots
  for (let m = 9 * 60; m < 27 * 60; m += 60) {
    const slotStartMs = dayStart.getTime() + m * 60 * 1000;
    const slotEndMs = slotStartMs + 60 * 60 * 1000;

    const startDateObj = new Date(slotStartMs);
    const endDateObj = new Date(slotEndMs);

    // Determine category
    const totalHours = Math.floor(m / 60);
    let periodCategory: DaySlotItem["periodCategory"] = "morning";
    if (totalHours >= 9 && totalHours < 12) {
      periodCategory = "morning";
    } else if (totalHours >= 12 && totalHours < 17) {
      periodCategory = "afternoon";
    } else if (totalHours >= 17 && totalHours < 21) {
      periodCategory = "evening";
    } else {
      periodCategory = "night";
    }

    // Check if 1-hour slot falls into any booking
    const matchingBooking = dayBookings.find((b) => {
      const bStart = new Date(b.starts_at).getTime();
      const bEnd = new Date(b.ends_at).getTime();
      return bStart < slotEndMs && bEnd > slotStartMs;
    });

    const isBooked = !!matchingBooking;
    const isMine =
      !!matchingBooking &&
      !!currentUserEmail &&
      matchingBooking.booked_by_email.toLowerCase() === currentUserEmail.toLowerCase();

    slots.push({
      slotId: `${formatDateKey(dayDate)}_${m}`,
      startMinuteOffset: m,
      endMinuteOffset: m + 60,
      startTimeLabel: formatTimeOnly(startDateObj),
      endTimeLabel: formatTimeOnly(endDateObj),
      periodCategory,
      isBooked,
      booking: matchingBooking,
      isMine,
    });
  }

  return slots;
}

// Build ISO string from day date and minute offset from 00:00 (e.g. 540 for 9:00 AM, 1500 for 1:00 AM next day)
export function createTimestampFromOffset(dayDate: Date, minuteOffset: number): string {
  const base = getStartOfDay(dayDate);
  const timestampMs = base.getTime() + minuteOffset * 60 * 1000;
  return new Date(timestampMs).toISOString();
}
