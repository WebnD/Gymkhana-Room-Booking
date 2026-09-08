"use client";

import { useState } from "react";
import Link from "next/link";
import { Send, AlertTriangle, CheckCircle2, ShieldAlert, X, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AVAILABLE_ROOMS,
  getRoomConfig,
  isAllowedBooker,
  generateTimeSlotOptions,
  TimeSlotOption,
} from "@/lib/config";
import {
  DayHeader,
  getRolling7Days,
  formatDateKey,
  createTimestampFromOffset,
} from "@/lib/calendar-utils";

interface BookingFormProps {
  currentUserEmail?: string | null;
  currentUserName?: string | null;
  initialDate?: Date;
  initialStartMinutes?: number;
  selectedRoom?: string;
  onRoomChange?: (roomId: string) => void;
  onBookingSuccess: () => void;
}

export default function BookingForm({
  currentUserEmail,
  currentUserName,
  initialDate,
  initialStartMinutes,
  selectedRoom = "meeting",
  onRoomChange,
  onBookingSuccess,
}: BookingFormProps) {
  const currentRoomConfig = getRoomConfig(selectedRoom);
  const rollingDays: DayHeader[] = getRolling7Days(new Date());
  const timeSlots: TimeSlotOption[] = generateTimeSlotOptions();

  // Form State initialized with props or defaults
  const [roomId, setRoomId] = useState<string>(selectedRoom);
  const [society, setSociety] = useState("");
  const [dateKey, setDateKey] = useState<string>(() =>
    formatDateKey(initialDate || new Date())
  );
  const [startMinutes, setStartMinutes] = useState<number>(() =>
    initialStartMinutes !== undefined ? initialStartMinutes : 540
  );
  const [endMinutes, setEndMinutes] = useState<number>(() =>
    initialStartMinutes !== undefined
      ? Math.min(initialStartMinutes + 60, 27 * 60)
      : 600
  );
  const [purpose, setPurpose] = useState("");

  // Status & Feedback State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canBook = isAllowedBooker(currentUserEmail);

  const handleClear = () => {
    setSociety("");
    setDateKey(formatDateKey(new Date()));
    setStartMinutes(540);
    setEndMinutes(600);
    setPurpose("");
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleRoomSelect = (newRoom: string) => {
    setRoomId(newRoom);
    onRoomChange?.(newRoom);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!currentUserEmail) {
      setErrorMessage("You must be signed in to book a room.");
      return;
    }

    if (!canBook) {
      setErrorMessage(
        "Only authorized society secretaries on the allow-list can book rooms. Your account is view-only."
      );
      return;
    }

    if (!society.trim()) {
      setErrorMessage("Please enter the Society or Group name.");
      return;
    }

    if (endMinutes <= startMinutes) {
      setErrorMessage("End time must be after Start time.");
      return;
    }

    // Find the chosen Day object
    const chosenDay = rollingDays.find((d) => d.dateKey === dateKey)?.date || new Date(dateKey);
    
    // Construct ISO timestamps
    const startsAtIso = createTimestampFromOffset(chosenDay, startMinutes);
    const endsAtIso = createTimestampFromOffset(chosenDay, endMinutes);

    try {
      setIsSubmitting(true);
      const supabase = createClient();

      const { error } = await supabase.from("bookings").insert({
        room: roomId || "meeting",
        starts_at: startsAtIso,
        ends_at: endsAtIso,
        society: society.trim(),
        purpose: purpose.trim() || null,
        booked_by_email: currentUserEmail.toLowerCase(),
        booked_by_name: currentUserName || currentUserEmail.split("@")[0],
        status: "booked",
      });

      if (error) {
        console.error("Supabase insert error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });

        // 1. PostgreSQL Exclusion Constraint (Slot overlap)
        if (
          error.code === "23P01" ||
          error.message?.toLowerCase().includes("no_overlapping_bookings") ||
          error.message?.toLowerCase().includes("exclusion") ||
          error.details?.toLowerCase().includes("conflicts with existing key")
        ) {
          setErrorMessage(
            `This time slot in ${getRoomConfig(roomId).name} is already booked or overlaps with an existing reservation. Please choose a different time or room.`
          );
        }
        // 2. Row Level Security Policy Violation
        else if (
          error.code === "42501" ||
          error.message?.toLowerCase().includes("row-level security") ||
          error.message?.toLowerCase().includes("policy")
        ) {
          setErrorMessage(
            `Access Denied: ${currentUserEmail} is not authorized by the security policy to book rooms. Please verify you are signed in with an official secretary account.`
          );
        }
        // 3. Other Database Errors
        else {
          setErrorMessage(error.message || error.details || "Failed to create booking.");
        }
        setIsSubmitting(false);
        return;
      }

      // Success
      setSuccessMessage(`Booking for ${getRoomConfig(roomId).name} confirmed successfully!`);
      setSociety("");
      setPurpose("");
      setIsSubmitting(false);
      onBookingSuccess();
    } catch {
      setErrorMessage("An unexpected error occurred while booking the room.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      id="booking-form-container"
      className="bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs text-slate-800"
    >
      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black tracking-tight text-slate-900">
            Reserve {currentRoomConfig.name}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Reserve a 1-hour interval slot between 09:00 AM and 03:00 AM (next day).
          </p>
        </div>

        {!canBook && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200 self-start sm:self-auto">
            <ShieldAlert className="w-3.5 h-3.5" />
            View-Only Mode
          </span>
        )}
      </div>

      {/* View-Only Alert Banner */}
      {!canBook && (
        <div className="mb-5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 text-xs leading-relaxed">
          <p className="font-bold mb-0.5">Authorized Booking Only</p>
          You are signed in with an institutional account. Only authorized society secretaries and coordinators on the Gymkhana allow-list can reserve slots.
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-red-700 text-xs leading-relaxed animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <span className="flex-1">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-400 hover:text-red-700 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Success Alert */}
      {successMessage && (
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between gap-2.5 text-emerald-800 text-xs font-medium animate-in fade-in">
          <div className="flex items-center gap-2.5 min-w-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate">{successMessage}</span>
          </div>
          <Link
            href="/my-bookings"
            className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold shrink-0 transition-colors"
          >
            View in My Bookings →
          </Link>
        </div>
      )}

      {/* The Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Room Selection Toggle */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Facility / Room <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_ROOMS.map((r) => {
              const isSelected = r.id === roomId;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRoomSelect(r.id)}
                  disabled={!canBook || isSubmitting}
                  className={`p-2.5 rounded-lg border text-left flex items-center gap-2 transition-all cursor-pointer disabled:opacity-60 ${
                    isSelected
                      ? "bg-blue-50 border-blue-500 text-blue-950 font-bold ring-1 ring-blue-500"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100/70"
                  }`}
                >
                  <Building2 className={`w-4 h-4 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                  <div className="min-w-0">
                    <p className="text-xs leading-tight truncate">{r.name}</p>
                    <p className="text-[10px] text-slate-500 font-normal truncate">{r.capacity} Persons</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Society / Group Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Society / Group Name <span className="text-red-500">*</span>
          </label>
          <input
            id="society-name-input"
            type="text"
            value={society}
            onChange={(e) => setSociety(e.target.value)}
            placeholder="e.g. Web & Coding Club"
            disabled={!canBook || isSubmitting}
            required
            className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
          />
        </div>

        {/* Booking Date Selector (within 7-day rolling window) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Booking Date <span className="text-red-500">*</span>
          </label>
          <select
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value)}
            disabled={!canBook || isSubmitting}
            className="w-full px-3.5 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60 cursor-pointer"
          >
            {rollingDays.map((day) => (
              <option key={day.dateKey} value={day.dateKey}>
                {day.dayName}, {day.displayLabel} {day.isToday ? "(Today)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Time pickers: Start Time & End Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Start Time <span className="text-red-500">*</span>
            </label>
            <select
              value={startMinutes}
              onChange={(e) => {
                const val = Number(e.target.value);
                setStartMinutes(val);
                if (endMinutes <= val) {
                  setEndMinutes(Math.min(val + 60, 27 * 60));
                }
              }}
              disabled={!canBook || isSubmitting}
              className="w-full px-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60 cursor-pointer"
            >
              {timeSlots.slice(0, -1).map((slot) => (
                <option key={slot.value} value={slot.offsetMinutes}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              End Time <span className="text-red-500">*</span>
            </label>
            <select
              value={endMinutes}
              onChange={(e) => setEndMinutes(Number(e.target.value))}
              disabled={!canBook || isSubmitting}
              className="w-full px-3 py-2.5 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60 cursor-pointer"
            >
              {timeSlots
                .filter((s) => s.offsetMinutes > startMinutes)
                .map((slot) => (
                  <option key={slot.value} value={slot.offsetMinutes}>
                    {slot.label}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Purpose of Booking */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Purpose / Agenda of Booking
          </label>
          <textarea
            rows={2}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Briefly describe the meeting agenda, event or practice session..."
            disabled={!canBook || isSubmitting}
            className="w-full px-3.5 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none disabled:opacity-60"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleClear}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={!canBook || isSubmitting}
            className="flex-[2] py-2.5 px-5 rounded-lg bg-[#132A4A] hover:bg-[#1A3862] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? "Submitting..." : `Confirm ${currentRoomConfig.shortName} Booking`}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
