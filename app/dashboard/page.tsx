"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import CalendarView from "@/components/CalendarView";
import BookingForm from "@/components/BookingForm";
import { Booking, getRoomConfig, isAllowedBooker } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import { getStartOfDay, addDays } from "@/lib/calendar-utils";
import { User } from "@supabase/supabase-js";
import { Calendar, PenLine, Building2, Sparkles, Users, Clock, MapPin } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<string>("meeting");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeMobileTab, setActiveMobileTab] = useState<"calendar" | "book">("calendar");
  const [selectedSlot, setSelectedSlot] = useState<{
    date: Date;
    minuteOffset: number;
  } | null>(null);

  const currentRoomConfig = getRoomConfig(selectedRoom);

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

  // Fetch bookings for the rolling 7 days starting from today and filtered by active room
  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    const today = new Date();
    const windowStart = getStartOfDay(today).toISOString();
    const windowEnd = addDays(getStartOfDay(today), 8).toISOString();

    const fetchRoomBookings = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("status", "booked")
        .eq("room", selectedRoom)
        .gte("ends_at", windowStart)
        .lte("starts_at", windowEnd)
        .order("starts_at", { ascending: true });

      if (isMounted && !error && data) {
        setBookings(data as Booking[]);
      }
    };

    fetchRoomBookings();

    // Real-time subscription to auto-update calendar on inserts/cancels
    const channel = supabase
      .channel(`bookings_realtime_${selectedRoom}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bookings",
        },
        () => {
          fetchRoomBookings();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [selectedRoom]);

  const handleSlotClick = (date: Date, minuteOffset: number) => {
    if (!canBook) return;
    setSelectedDate(date);
    setSelectedSlot({ date, minuteOffset });
    setActiveMobileTab("book");

    // Smooth scroll to booking form and focus the Society input
    setTimeout(() => {
      const formEl = document.getElementById("booking-form-section");
      formEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      const inputEl = document.getElementById("society-name-input");
      inputEl?.focus();
    }, 100);
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
      .eq("room", selectedRoom)
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-7 space-y-6">
        
        {/* Mobile View Switcher (ONLY for allow-listed secretaries) */}
        {canBook && (
          <div className="lg:hidden flex items-center bg-slate-200/80 p-1 rounded-lg">
            <button
              onClick={() => setActiveMobileTab("calendar")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
                activeMobileTab === "calendar"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule</span>
            </button>
            <button
              onClick={() => setActiveMobileTab("book")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${
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

        {/* Section 1: 7-Day Day Selector & Daily Time Slots Grid with Room Switcher */}
        <div className={`${canBook && activeMobileTab === "book" ? "hidden lg:block" : "block"} w-full`}>
          <CalendarView
            bookings={bookings}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            selectedRoom={selectedRoom}
            onSelectRoom={setSelectedRoom}
            currentUserEmail={userEmail}
            onSlotClick={canBook ? handleSlotClick : undefined}
          />
        </div>

        {/* Section 2: Room Info & Booking Request Form (ONLY FOR ALLOW-LISTED SECRETARIES) */}
        {canBook && (
          <div
            id="booking-form-section"
            className={`${activeMobileTab === "book" ? "block" : "hidden lg:block"} grid grid-cols-1 lg:grid-cols-12 gap-5 items-start animate-in fade-in pt-1`}
          >
            {/* Left Column: Room Details with Gymkhana Crest Watermark */}
            <div className="lg:col-span-4 space-y-4">
              
              <div className="relative overflow-hidden bg-white rounded-xl p-5 sm:p-6 border border-slate-200/80 shadow-xs text-slate-800">
                {/* Gymkhana Crest Watermark Motif in the background */}
                <div className="absolute -right-6 -bottom-6 w-36 h-36 opacity-[0.07] pointer-events-none select-none">
                  <Image
                    src="/Gymkhana logo.svg"
                    alt="Gymkhana Crest Watermark"
                    width={144}
                    height={144}
                    className="object-contain"
                  />
                </div>

                {/* Facility Header */}
                <div className="relative z-10 flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                      {currentRoomConfig.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {currentRoomConfig.location}
                    </p>
                  </div>
                </div>

                <p className="relative z-10 text-xs text-slate-600 leading-relaxed mb-4">
                  {currentRoomConfig.description}
                </p>

                {/* Room Specs */}
                <div className="relative z-10 space-y-2 pt-3 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Capacity
                    </span>
                    <span className="font-bold text-slate-800">{currentRoomConfig.capacity} Persons</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Operating Hours
                    </span>
                    <span className="font-bold text-slate-800">09:00 AM – 03:00 AM</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Granularity</span>
                    <span className="font-bold text-slate-800">1 Hour Slots</span>
                  </div>
                </div>

                {/* Room Amenities */}
                <div className="relative z-10 mt-4 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-black text-slate-700 uppercase tracking-wider mb-2">
                    Room Amenities
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {currentRoomConfig.amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="px-2.5 py-1 bg-slate-50 text-slate-700 text-[11px] font-medium rounded-md border border-slate-200/70"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pro-Tip Box */}
              <div className="bg-blue-50/70 rounded-xl p-4 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Tip:</strong> Tap any available time slot in the schedule above to automatically pre-fill the date and start time.
                </p>
              </div>

            </div>

            {/* Right Column: New Booking Request Form */}
            <div className="lg:col-span-8">
              <BookingForm
                key={
                  selectedSlot
                    ? `${selectedRoom}_${selectedSlot.date.toISOString()}_${selectedSlot.minuteOffset}`
                    : `form_${selectedRoom}_${selectedDate.toISOString()}`
                }
                currentUserEmail={userEmail}
                currentUserName={userName}
                initialDate={selectedSlot?.date || selectedDate}
                initialStartMinutes={selectedSlot?.minuteOffset}
                selectedRoom={selectedRoom}
                onRoomChange={setSelectedRoom}
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
