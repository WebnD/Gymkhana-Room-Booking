"use client";

import { useState } from "react";
import { Send, AlertTriangle, CheckCircle2, ShieldAlert, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ROOM_CONFIG, isAllowedBooker, generateTimeSlotOptions, TimeSlotOption } from "@/lib/config";
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
  onBookingSuccess: () => void;
}

export default function BookingForm({
  currentUserEmail,
  currentUserName,
  initialDate,
  initialStartMinutes,
  onBookingSuccess,
}: BookingFormProps) {
  const rollingDays: DayHeader[] = getRolling7Days(new Date());
  const timeSlots: TimeSlotOption[] = generateTimeSlotOptions();

  // Form State initialized with props or defaults
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
        room: ROOM_CONFIG.id,
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
            "This time slot has already been booked or overlaps with an existing reservation. Please choose a different time."
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
      setSuccessMessage("Booking confirmed successfully!");
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
    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-slate-800">
      
      {/* Card Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black tracking-tight text-slate-900">
            Request Meeting Room
          </h3>
          <p className="text-xs text-slate-500">
            Reserve a 30-minute interval slot between 09:00 AM and 03:00 AM (next day).
          </p>
        </div>

        {!canBook && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            <ShieldAlert className="w-3.5 h-3.5" />
            View-Only Mode
          </span>
        )}
      </div>

      {/* View-Only Alert Banner */}
      {!canBook && (
        <div className="mb-5 p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
          <p className="font-bold mb-0.5">Authorized Booking Only</p>
          You are signed in with an institutional account. Only authorized society secretaries and coordinators on the Gymkhana allow-list can reserve slots.
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-xs leading-relaxed animate-in fade-in">
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
        <div className="mb-5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-emerald-800 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="flex-1">{successMessage}</span>
        </div>
      )}

      {/* The Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Society / Group Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Society / Group Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={society}
            onChange={(e) => setSociety(e.target.value)}
            placeholder="e.g. Web & Coding Club"
            disabled={!canBook || isSubmitting}
            required
            className="w-full px-4 py-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
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
            className="w-full px-4 py-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60 cursor-pointer"
          >
            {rollingDays.map((day) => (
              <option key={day.dateKey} value={day.dateKey}>
                {day.dayName}, {day.displayLabel} {day.isToday ? "(Today)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Time pickers: Start Time & End Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              className="w-full px-3.5 py-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60 cursor-pointer"
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
              className="w-full px-3.5 py-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60 cursor-pointer"
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
            Purpose of Booking
          </label>
          <textarea
            rows={3}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            placeholder="Briefly describe the meeting agenda or event..."
            disabled={!canBook || isSubmitting}
            className="w-full px-4 py-3 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none disabled:opacity-60"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleClear}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 cursor-pointer"
          >
            Clear
          </button>

          <button
            type="submit"
            disabled={!canBook || isSubmitting}
            className="flex-[2] py-3 px-5 rounded-xl bg-[#132A4A] hover:bg-[#1A3862] text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>{isSubmitting ? "Submitting..." : "Submit Room Booking"}</span>
          </button>
        </div>

      </form>
    </div>
  );
}
