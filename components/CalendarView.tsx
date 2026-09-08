"use client";

import { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Info,
  CheckCircle,
  Plus,
} from "lucide-react";
import { Booking } from "@/lib/config";
import {
  DayHeader,
  DaySlotItem,
  getRolling7Days,
  getDaySlotItems,
  formatFullDayDate,
  formatDateKey,
} from "@/lib/calendar-utils";
import { getSocietyTheme } from "@/lib/society-colors";

interface CalendarViewProps {
  bookings: Booking[];
  selectedDate: Date;
  onSelectDate: (d: Date) => void;
  currentUserEmail?: string | null;
  onSlotClick?: (date: Date, minuteOffset: number) => void;
}

export default function CalendarView({
  bookings,
  selectedDate,
  onSelectDate,
  currentUserEmail,
  onSlotClick,
}: CalendarViewProps) {
  const days: DayHeader[] = getRolling7Days(new Date(), bookings);
  const selectedKey = formatDateKey(selectedDate);
  const [filterPeriod, setFilterPeriod] = useState<"all" | "morning" | "afternoon" | "evening" | "night">("all");
  const [selectedBookingModal, setSelectedBookingModal] = useState<Booking | null>(null);

  // Get slots for the currently selected day
  const daySlots: DaySlotItem[] = getDaySlotItems(
    selectedDate,
    bookings,
    currentUserEmail
  );

  // Filter slots based on selected period
  const filteredSlots = daySlots.filter((slot) => {
    if (filterPeriod === "all") return true;
    return slot.periodCategory === filterPeriod;
  });

  const bookedCount = daySlots.filter((s) => s.isBooked).length;
  const availableCount = daySlots.length - bookedCount;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden text-slate-800">
      
      {/* 1. Top Section: 7-Day Horizontal Date Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                7-Day Booking Schedule
              </h2>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                Rolling Window
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a date below to view hourly slot availability and make reservations.
            </p>
          </div>
        </div>

        {/* Horizontal Scrolling 7-Day Date Strip */}
        <div className="overflow-x-auto pb-1 -mx-1 px-1 flex gap-2 sm:gap-3 select-none no-scrollbar">
          {days.map((day) => {
            const isSelected = day.dateKey === selectedKey;

            return (
              <button
                key={day.dateKey}
                onClick={() => onSelectDate(day.date)}
                className={`flex-1 min-w-[85px] sm:min-w-[100px] p-2.5 sm:p-3 rounded-2xl border transition-all text-center flex flex-col items-center justify-between gap-1 cursor-pointer focus:outline-none ${
                  isSelected
                    ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-blue-500/30 scale-[1.02]"
                    : "bg-white text-slate-700 border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/80"
                }`}
              >
                <span
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    isSelected ? "text-blue-300" : "text-slate-400"
                  }`}
                >
                  {day.dayName}
                </span>

                <span className="text-lg sm:text-xl font-black leading-none my-0.5">
                  {day.dayNum}
                </span>

                <div className="flex items-center gap-1">
                  {day.isToday && (
                    <span
                      className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded ${
                        isSelected ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      Today
                    </span>
                  )}
                  {day.bookingCount !== undefined && day.bookingCount > 0 && (
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                        isSelected ? "bg-amber-400 text-slate-900" : "bg-amber-100 text-amber-900"
                      }`}
                      title={`${day.bookingCount} slots booked`}
                    >
                      {day.bookingCount}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Selected Day Header & Time Filter Tabs */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
            <h3 className="text-base font-extrabold text-slate-900">
              {formatFullDayDate(selectedDate)}
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {availableCount} Available Slots
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {bookedCount} Booked
            </span>
          </div>
        </div>

        {/* Filter Period Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 bg-slate-100/90 p-1 rounded-xl text-xs font-bold text-slate-600 self-start md:self-auto">
          <button
            onClick={() => setFilterPeriod("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
              filterPeriod === "all" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            All Hours
          </button>
          <button
            onClick={() => setFilterPeriod("morning")}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
              filterPeriod === "morning" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            Morning (9AM–12PM)
          </button>
          <button
            onClick={() => setFilterPeriod("afternoon")}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
              filterPeriod === "afternoon" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            Afternoon (12PM–5PM)
          </button>
          <button
            onClick={() => setFilterPeriod("evening")}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
              filterPeriod === "evening" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            Evening (5PM–9PM)
          </button>
          <button
            onClick={() => setFilterPeriod("night")}
            className={`px-3 py-1.5 rounded-lg transition-colors shrink-0 cursor-pointer ${
              filterPeriod === "night" ? "bg-white text-slate-900 shadow-xs" : "hover:text-slate-900"
            }`}
          >
            Late Night (9PM–3AM)
          </button>
        </div>
      </div>

      {/* 3. Time Slots Grid */}
      <div className="p-4 sm:p-6 bg-slate-50/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredSlots.map((slot) => {
            if (slot.isBooked && slot.booking) {
              const theme = getSocietyTheme(slot.booking.society);

              // BOOKED SLOT CARD WITH SOCIETY SPECIFIC COLOR ACCENT
              return (
                <div
                  key={slot.slotId}
                  onClick={() => setSelectedBookingModal(slot.booking!)}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-2 shadow-xs hover:shadow-md cursor-pointer ${theme.cardBg} ${theme.borderColor} ${theme.textColor} ${
                    slot.isMine ? `ring-2 ${theme.ringColor}` : ""
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span className={`w-2 h-2 rounded-full ${theme.dotColor} shrink-0`} />
                        <span className="text-xs font-black leading-tight truncate">
                          {slot.booking.society}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          slot.isMine
                            ? "bg-slate-900 text-white"
                            : `${theme.badgeBg} ${theme.badgeText}`
                        }`}
                      >
                        {slot.isMine ? "Your Booking" : "Booked"}
                      </span>
                    </div>

                    {slot.booking.purpose && (
                      <p className={`text-[11px] ${theme.subTextColor} line-clamp-1`}>
                        {slot.booking.purpose}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-semibold pt-1.5 border-t border-black/5">
                    <span className="flex items-center gap-1 text-slate-700">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {slot.startTimeLabel} – {slot.endTimeLabel}
                    </span>
                    <span className={`text-[10px] font-bold ${theme.subTextColor} hover:underline`}>
                      Details →
                    </span>
                  </div>
                </div>
              );
            }

            // AVAILABLE SLOT CARD
            const isClickable = !!onSlotClick;

            return (
              <div
                key={slot.slotId}
                onClick={() => {
                  if (isClickable) {
                    onSlotClick(selectedDate, slot.startMinuteOffset);
                  }
                }}
                className={`p-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-xs transition-all text-left flex items-center justify-between gap-2 group ${
                  isClickable
                    ? "hover:bg-blue-50/60 hover:border-blue-400 hover:shadow-sm cursor-pointer"
                    : "cursor-default"
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-800">
                      {slot.startTimeLabel} – {slot.endTimeLabel}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-emerald-700 block mt-0.5">
                    {isClickable ? "Available for Booking" : "Free Slot"}
                  </span>
                </div>

                {isClickable && (
                  <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-blue-600 text-slate-500 group-hover:text-white flex items-center justify-center transition-colors shrink-0">
                    <Plus className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Booking Details Modal on Click */}
      {selectedBookingModal && (() => {
        const modalTheme = getSocietyTheme(selectedBookingModal.society);
        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setSelectedBookingModal(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 text-slate-900 animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
                <div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${modalTheme.badgeBg} ${modalTheme.badgeText} rounded-full mb-1.5`}>
                    <CheckCircle className="w-3 h-3" />
                    Confirmed Booking
                  </span>
                  <h3 className="text-xl font-black text-slate-900">
                    {selectedBookingModal.society}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBookingModal(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-lg leading-none cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-slate-600">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong className="text-slate-800">Time:</strong>{" "}
                    {new Date(selectedBookingModal.starts_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}{" "}
                    –{" "}
                    {new Date(selectedBookingModal.ends_at).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>

                <div className="flex items-center gap-2.5">
                  <User className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>
                    <strong className="text-slate-800">Booked By:</strong>{" "}
                    {selectedBookingModal.booked_by_email}
                  </span>
                </div>

                {selectedBookingModal.purpose && (
                  <div className="flex items-start gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-800 block mb-0.5">Purpose:</strong>
                      <p className="text-slate-600">{selectedBookingModal.purpose}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedBookingModal(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
