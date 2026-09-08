// ==============================================================================
// Society Color Theme System — Dynamic & Deterministic Accents
// Gymkhana Room Booking System (IIT Bhubaneswar)
// ==============================================================================

export interface SocietyTheme {
  cardBg: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
  badgeText: string;
  subTextColor: string;
  ringColor: string;
  dotColor: string;
}

// Curated pastel palettes for distinct societies
const PALETTES: SocietyTheme[] = [
  // 1. Indigo / Royal Tech
  {
    cardBg: "bg-indigo-50/95",
    borderColor: "border-indigo-300",
    textColor: "text-indigo-950",
    badgeBg: "bg-indigo-600",
    badgeText: "text-white",
    subTextColor: "text-indigo-700",
    ringColor: "ring-indigo-500/20",
    dotColor: "bg-indigo-500",
  },
  // 2. Emerald / Green Sports
  {
    cardBg: "bg-emerald-50/95",
    borderColor: "border-emerald-300",
    textColor: "text-emerald-950",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
    subTextColor: "text-emerald-700",
    ringColor: "ring-emerald-500/20",
    dotColor: "bg-emerald-500",
  },
  // 3. Amber / Golden Cultural
  {
    cardBg: "bg-amber-50/95",
    borderColor: "border-amber-300",
    textColor: "text-amber-950",
    badgeBg: "bg-amber-500",
    badgeText: "text-slate-900 font-black",
    subTextColor: "text-amber-800",
    ringColor: "ring-amber-500/20",
    dotColor: "bg-amber-500",
  },
  // 4. Rose / Pink Dance & Drama
  {
    cardBg: "bg-rose-50/95",
    borderColor: "border-rose-300",
    textColor: "text-rose-950",
    badgeBg: "bg-rose-600",
    badgeText: "text-white",
    subTextColor: "text-rose-700",
    ringColor: "ring-rose-500/20",
    dotColor: "bg-rose-500",
  },
  // 5. Cyan / Electric Robotics
  {
    cardBg: "bg-cyan-50/95",
    borderColor: "border-cyan-300",
    textColor: "text-cyan-950",
    badgeBg: "bg-cyan-600",
    badgeText: "text-white",
    subTextColor: "text-cyan-800",
    ringColor: "ring-cyan-500/20",
    dotColor: "bg-cyan-500",
  },
  // 6. Purple / Astronomy & Science
  {
    cardBg: "bg-purple-50/95",
    borderColor: "border-purple-300",
    textColor: "text-purple-950",
    badgeBg: "bg-purple-600",
    badgeText: "text-white",
    subTextColor: "text-purple-700",
    ringColor: "ring-purple-500/20",
    dotColor: "bg-purple-500",
  },
  // 7. Orange / Music & Fine Arts
  {
    cardBg: "bg-orange-50/95",
    borderColor: "border-orange-300",
    textColor: "text-orange-950",
    badgeBg: "bg-orange-600",
    badgeText: "text-white",
    subTextColor: "text-orange-700",
    ringColor: "ring-orange-500/20",
    dotColor: "bg-orange-500",
  },
  // 8. Teal / Media & Photography
  {
    cardBg: "bg-teal-50/95",
    borderColor: "border-teal-300",
    textColor: "text-teal-950",
    badgeBg: "bg-teal-600",
    badgeText: "text-white",
    subTextColor: "text-teal-700",
    ringColor: "ring-teal-500/20",
    dotColor: "bg-teal-500",
  },
  // 9. Violet / Fest Coordinators & Council
  {
    cardBg: "bg-violet-50/95",
    borderColor: "border-violet-300",
    textColor: "text-violet-950",
    badgeBg: "bg-violet-600",
    badgeText: "text-white",
    subTextColor: "text-violet-700",
    ringColor: "ring-violet-500/20",
    dotColor: "bg-violet-500",
  },
  // 10. Blue / Web & Coding
  {
    cardBg: "bg-blue-50/95",
    borderColor: "border-blue-300",
    textColor: "text-blue-950",
    badgeBg: "bg-blue-600",
    badgeText: "text-white",
    subTextColor: "text-blue-700",
    ringColor: "ring-blue-500/20",
    dotColor: "bg-blue-500",
  },
];

// Special predefined overrides for key societies/keywords
const PREDEFINED_SOCIETY_THEMES: Record<string, SocietyTheme> = {
  web: PALETTES[9], // Blue
  coding: PALETTES[9], // Blue
  robotics: PALETTES[4], // Cyan
  music: PALETTES[6], // Orange
  dance: PALETTES[3], // Rose
  drama: PALETTES[3], // Rose
  drams: PALETTES[3], // Rose
  photo: PALETTES[7], // Teal
  clix: PALETTES[7], // Teal
  badminton: PALETTES[1], // Emerald
  volleyball: PALETTES[1], // Emerald
  boardgames: PALETTES[2], // Amber
  astronomy: PALETTES[5], // Purple
  pravaah: PALETTES[8], // Violet
  ashvamedha: PALETTES[0], // Indigo
};

// Deterministic string hash
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Returns a consistent and distinct visual color theme for any society name.
 */
export function getSocietyTheme(societyName: string): SocietyTheme {
  if (!societyName) return PALETTES[0];

  const lower = societyName.toLowerCase().trim();

  // Check if matches any predefined keyword
  for (const [key, theme] of Object.entries(PREDEFINED_SOCIETY_THEMES)) {
    if (lower.includes(key)) {
      return theme;
    }
  }

  // Fallback to deterministic hash over the 10 distinct palettes
  const index = hashString(lower) % PALETTES.length;
  return PALETTES[index];
}
