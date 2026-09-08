"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CalendarView from "@/components/CalendarView";
import BookingForm from "@/components/BookingForm";
import { Booking, ROOM_CONFIG, isAllowedBooker } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { getStartOfDay, addDays } from "@/lib/calendar-utils";
import { User } from "@supabase/supabase-js";
import { Calendar, PenLine, Building2, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeMobileTab, setActiveMobileTab] = useState<"calendar" | "book">("calendar");
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    minuteOffset: number;
  } | null>(null);

  // Load user data on mount
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (isMounted) {
        setUser(currentUser);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const userEmail = user?.email ?? null;
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (userEmail ? userEmail.split("@")[0] : "Student");
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  const canBook = isAllowedBooker(userEmail);

  // Fetch bookings for the rolling 7 days starting from today
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    const today = new Date();
    const windowStart = getStartOfDay(today).toISOString();
    const windowEnd = addDays(getStartOfDay(today), 8).toISOString();

    supabase
      .from("bookings")
      .select("*")
      .eq("status", "booked")
      .gte("ends_at", windowStart)
      .lte("starts_at", windowEnd)
      .order("starts_at", { ascending: true })
      .then(({ data, error }) => {
        if (isMounted && !error && data) {
          setBookings(data as Booking[]);
        }
      });

    // Real-time subscription to auto-update calendar on inserts/cancels
    const channel = supabase
      .channel("bookings_realtime_dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          supabase
            .from("bookings")
            .select("*")
            .eq("status", "booked")
            .gte("ends_at", windowStart)
            .lte("starts_at", windowEnd)
            .order("starts_at", { ascending: true })
            .then(({ data, error }) => {
              if (isMounted && !error && data) {
                setBookings(data as Booking[]);
              }
            });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSlotClick = (date: Date, minuteOffset: number) => {
    if (!canBook) return;
    setSelectedDate(date);
    setSelectedSlot({ date, minuteOffset });
    setActiveMobileTab("book");
  };

  const handleBookingSuccess = () => {
    const supabase = createClient();
    const today = new Date();
    const windowStart = getStartOfDay(today).toISOString();
    const windowEnd = addDays(getStartOfDay(today), 8).toISOString();

    supabase
      .from("bookings")
      .select("*")
      .eq("status", "booked")
      .gte("ends_at", windowStart)
      .lte("starts_at", windowEnd)
      .order("starts_at", { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setBookings(data as Booking[]);
        }
      });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Navbar */}
      <Navbar
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 space-y-6">
        
        {/* Mobile View Switcher (ONLY for allow-listed secretaries) */}
        {canBook && (
          <div className="lg:hidden flex items-center bg-slate-200/80 p-1 rounded-xl">
            <button
              onClick={() => setActiveMobileTab("calendar")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeMobileTab === "calendar"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule Slots</span>
            </button>
            <button
              onClick={() => setActiveMobileTab("book")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeMobileTab === "book"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <PenLine className="w-4 h-4" />
              <span>Book Room</span>
            </button>
          </div>
        )}

        {/* Section 1: 7-Day Day Selector & Daily Time Slots Grid */}
        <div className={`${canBook && activeMobileTab === "book" ? "hidden lg:block" : "block"} w-full`}>
          <CalendarView
            bookings={bookings}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            currentUserEmail={userEmail}
            onSlotClick={canBook ? handleSlotClick : undefined}
          />
        </div>

        {/* Section 2: Room Info & Booking Request Form (ONLY FOR ALLOW-LISTED SECRETARIES) */}
        {canBook && (
          <div
            className={`${activeMobileTab === "book" ? "block" : "hidden lg:block"} grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-in fade-in`}
          >
            {/* Left Column: Room Amenities & Instructions */}
            <div className="lg:col-span-4 space-y-4">
              
              <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs text-slate-800">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {ROOM_CONFIG.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {ROOM_CONFIG.location}
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Capacity</span>
                    <span className="font-bold text-slate-800">{ROOM_CONFIG.capacity} Persons</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Operating Hours</span>
                    <span className="font-bold text-slate-800">09:00 AM – 03:00 AM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Granularity</span>
                    <span className="font-bold text-slate-800">1 Hour Slots</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                    Amenities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {ROOM_CONFIG.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="px-2.5 py-1 bg-slate-50 text-slate-700 text-[11px] font-medium rounded-lg border border-slate-200/70"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Hint Box */}
              <div className="bg-blue-50/70 rounded-2xl p-4 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Tip:</strong> Tap any available time slot in the schedule to automatically pre-fill the booking date and start time.
                </p>
              </div>

            </div>

            {/* Right Column: New Booking Request Form */}
            <div className="lg:col-span-8">
              <BookingForm
                key={
                  selectedSlot
                    ? `${selectedSlot.date.toISOString()}_${selectedSlot.minuteOffset}`
                    : `form_${selectedDate.toISOString()}`
                }
                currentUserEmail={userEmail}
                currentUserName={userName}
                initialDate={selectedSlot?.date || selectedDate}
                initialStartMinutes={selectedSlot?.minuteOffset}
                onBookingSuccess={handleBookingSuccess}
              />
            </div>

          </div>
        )}

      </main>

      {/* Navy Footer with WebD attribution */}
      <Footer />
    </div>
  );
}
