// ==============================================================================
// Gymkhana Room Booking System — Configuration & Constants
// ==============================================================================

export interface RoomConfig {
  id: string;
  name: string;
  shortName: string;
  capacity: number;
  amenities: string[];
  location: string;
  status: "available" | "maintenance" | "occupied";
  description: string;
}

export const AVAILABLE_ROOMS: RoomConfig[] = [
  {
    id: "meeting",
    name: "Meeting Room",
    shortName: "Meeting",
    capacity: 30,
    amenities: ["Projector", "High-speed Wi-Fi", "Air Conditioning"],
    location: "Student Activity Centre (SAC), 1st Floor",
    status: "available",
    description: "Ideal for formal society meetings, executive discussions, and core team planning.",
  },
  {
    id: "multipurpose",
    name: "Multipurpose Room",
    shortName: "Multipurpose",
    capacity: 80,
    amenities: ["Audio System", "Air Conditioning", "Flexible Seating", "High-speed Wi-Fi"],
    location: "Student Activity Centre (SAC), Ground Floor",
    status: "available",
    description: "Spacious hall designed for society workshops, informal meets, rehearsals, and large team gatherings.",
  },
];

export const ROOM_CONFIG = AVAILABLE_ROOMS[0];

export function getRoomConfig(roomId?: string): RoomConfig {
  if (!roomId) return AVAILABLE_ROOMS[0];
  const found = AVAILABLE_ROOMS.find((r) => r.id.toLowerCase() === roomId.toLowerCase());
  return found || AVAILABLE_ROOMS[0];
}

// Operating hours: 9:00 AM to 3:00 AM (next day)
// Total 18 hours per booking date = 18 slots of 1 hour each
export const OPERATING_HOURS = {
  startHour: 9,      // 09:00 AM
  startMinute: 0,
  endHourNextDay: 3, // 03:00 AM (+1 day)
  endMinuteNextDay: 0,
  slotDurationMinutes: 60,
};

// Allow-list of authorized emails who can create bookings
export const ALLOWED_BOOKER_EMAILS = [
  "secyweb.sg@iitbbs.ac.in",
  "secyfebs.sg@iitbbs.ac.in",
  "secyrobotics.sg@iitbbs.ac.in",
  "secyprogsoc.sg@iitbbs.ac.in",
  "secyastronomy.sg@iitbbs.ac.in",
  "secymusic.sg@iitbbs.ac.in",
  "secysfs.sg@iitbbs.ac.in",
  "secydance.sg@iitbbs.ac.in",
  "secybadminton.sg@iitbbs.ac.in",
  "clix.photosoc@iitbbs.ac.in",
  "secydrams.sg@iitbbs.ac.in",
  "secyvolleyball.sg@iitbbs.ac.in",
  "secyboardgames.sg@iitbbs.ac.in",
  "gsecsnt.sg@iitbbs.ac.in",
  "gsecsports.sg@iitbbs.ac.in",
  "gseccul.sg@iitbbs.ac.in",
  "vpresident.sg@iitbbs.ac.in",
  "coord.pravaah@iitbbs.ac.in",
  "coord.ashvamedha@iitbbs.ac.in",
];

export function isAllowedBooker(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return ALLOWED_BOOKER_EMAILS.some((allowed) => allowed.toLowerCase() === normalized);
}

export function isIITBBSDomain(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith("@iitbbs.ac.in");
}

export interface Booking {
  id: string;
  room: string;
  starts_at: string;
  ends_at: string;
  society: string;
  purpose?: string | null;
  booked_by_email: string;
  booked_by_name?: string | null;
  status: "booked" | "cancelled";
  created_at: string;
}

// Generate the 1-hour time slots list for a single operating day
export interface TimeSlotOption {
  label: string;      // e.g. "09:00 AM", "11:00 PM", "01:00 AM (+1)"
  value: string;      // minute offset
  offsetMinutes: number; // minutes from 00:00 of the day (e.g. 9*60=540, 27*60=1620 for 3 AM next day)
}

export function generateTimeSlotOptions(): TimeSlotOption[] {
  const slots: TimeSlotOption[] = [];
  // 9:00 AM (9*60 = 540 min) to 3:00 AM next day (27*60 = 1620 min) in 60-minute steps
  for (let mins = 9 * 60; mins <= 27 * 60; mins += 60) {
    const totalHours = Math.floor(mins / 60);
    const isNextDay = totalHours >= 24;
    const displayHour = totalHours % 24;
    
    const period = displayHour >= 12 && !isNextDay ? "PM" : isNextDay ? (displayHour >= 12 ? "PM" : "AM") : displayHour === 0 ? "AM" : displayHour < 12 ? "AM" : "PM";
    const hour12 = displayHour % 12 === 0 ? 12 : displayHour % 12;
    const nextDaySuffix = isNextDay ? " (Next Day)" : "";
    
    slots.push({
      label: `${hour12}:00 ${period}${nextDaySuffix}`,
      value: `${mins}`,
      offsetMinutes: mins,
    });
  }
  return slots;
}
