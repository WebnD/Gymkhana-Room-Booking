"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Booking, AVAILABLE_ROOMS, getRoomConfig, isAllowedBooker } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar as CalendarIcon,
  Clock,
  AlertCircle,
  CheckCircle2,
  X,
  AlertTriangle,
  DoorOpen,
  RefreshCw,
} from "lucide-react";
import {
  formatDisplayDate,
  formatTimeOnly,
  getStartOfDay,
} from "@/lib/calendar-utils";
import { getSocietyTheme } from "@/lib/society-colors";
import { User } from "@supabase/supabase-js";

export default function MyBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>("all");
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [referenceTime, setReferenceTime] = useState<number>(() => Date.now());

  const fetchMyBookings = useCallback(async (userEmail: string) => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .ilike("booked_by_email", userEmail.trim())
        .order("starts_at", { ascending: true });

      if (!error && data) {
        setMyBookings(data as Booking[]);
        setReferenceTime(Date.now());
      }
    } catch (err) {
      console.error("Error fetching my bookings:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    const init = async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!isMounted) return;
      setUser(currentUser);

      if (currentUser?.email) {
        if (!isAllowedBooker(currentUser.email)) {
          router.replace("/dashboard");
          return;
        }
        fetchMyBookings(currentUser.email);
      } else {
        setIsLoading(false);
      }
    };

    init();

    // Real-time subscription to auto-update my-bookings on any inserts/cancels
    const channel = supabase
      .channel("my_bookings_realtime_stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        () => {
          supabase.auth.getUser().then(({ data: { user: u } }) => {
            if (isMounted && u?.email) {
              fetchMyBookings(u.email);
            }
          });
        }
      )
      .subscribe();

    // Re-fetch when browser window regains focus
    const handleFocus = () => {
      supabase.auth.getUser().then(({ data: { user: u } }) => {
        if (isMounted && u?.email) {
          fetchMyBookings(u.email);
        }
      });
    };
    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchMyBookings, router]);

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking || !user?.email) return;

    try {
      setIsCancelling(true);
      setActionError(null);
      setActionSuccess(null);

      const supabase = createClient();

      // Soft delete: update status to 'cancelled' so slot becomes free immediately
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", cancelModalBooking.id)
        .ilike("booked_by_email", user.email.trim());

      if (error) {
        setActionError(error.message || "Failed to cancel booking.");
        setIsCancelling(false);
        return;
      }

      setActionSuccess("Booking cancelled successfully. The slot is now free.");
      setCancelModalBooking(null);
      setIsCancelling(false);

      // Refresh list
      fetchMyBookings(user.email);
    } catch {
      setActionError("An unexpected error occurred while cancelling.");
      setIsCancelling(false);
    }
  };

  const userEmail = user?.email ?? null;
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (userEmail ? userEmail.split("@")[0] : "Student");
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  // Filter by selected room if applicable
  const filteredBookings = myBookings.filter((b) => {
    if (selectedRoomFilter === "all") return true;
    return b.room?.toLowerCase() === selectedRoomFilter.toLowerCase();
  });

  // Split into upcoming (today & future) and past bookings
  const now = referenceTime;
  const todayMidnightMs = getStartOfDay(new Date()).getTime();

  const upcomingBookings = filteredBookings.filter(
    (b) => b.status === "booked" && new Date(b.ends_at).getTime() >= todayMidnightMs
  );
  const pastBookings = filteredBookings.filter(
    (b) => b.status === "cancelled" || new Date(b.ends_at).getTime() < todayMidnightMs
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Top Navbar */}
      <Navbar
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        
        {/* Page Title & Controls Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              My Bookings
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Manage and view your upcoming and past room reservations across SAC facilities.
            </p>
          </div>

          {/* Room Filter Pills & Refresh Button */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center bg-slate-200/80 p-1 rounded-lg text-xs font-bold">
              <button
                onClick={() => setSelectedRoomFilter("all")}
                className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                  selectedRoomFilter === "all"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All Facilities
              </button>
              {AVAILABLE_ROOMS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRoomFilter(r.id)}
                  className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                    selectedRoomFilter === r.id
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {r.shortName}
                </button>
              ))}
            </div>

            <button
              onClick={() => userEmail && fetchMyBookings(userEmail)}
              disabled={isLoading}
              title="Refresh Bookings"
              className="p-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        {/* Global Action Notifications */}
        {actionSuccess && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-800 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="flex-1">{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-xs font-medium animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="flex-1">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Bookings Lists (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* UPCOMING & ACTIVE BOOKINGS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Active & Upcoming Bookings
                </h2>
                <span className="text-[10px] font-black px-2 py-0.2 bg-blue-100 text-blue-800 rounded-md">
                  {upcomingBookings.length}
                </span>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <div className="h-24 bg-white rounded-xl animate-pulse border border-slate-200/80" />
                  <div className="h-24 bg-white rounded-xl animate-pulse border border-slate-200/80" />
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-slate-200/80 text-center text-slate-500 shadow-xs">
                  <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700 text-xs">No active or upcoming bookings</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Bookings made for today or future dates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingBookings.map((b) => {
                    const startDate = new Date(b.starts_at);
                    const endDate = new Date(b.ends_at);
                    const theme = getSocietyTheme(b.society);
                    const roomInfo = getRoomConfig(b.room);

                    const isHappeningNow = now >= startDate.getTime() && now < endDate.getTime();
                    const isCompletedToday = now >= endDate.getTime();
                    const canCancel = !isCompletedToday;

                    return (
                      <div
                        key={b.id}
                        className={`bg-white rounded-xl p-4 sm:p-5 border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300 ${
                          isHappeningNow ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200/80"
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            {isHappeningNow ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide bg-emerald-600 text-white rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                HAPPENING NOW
                              </span>
                            ) : isCompletedToday ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-700 rounded">
                                COMPLETED TODAY
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${theme.badgeBg} ${theme.badgeText} rounded`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor === 'bg-amber-500' ? 'bg-slate-900' : 'bg-white'}`} />
                                CONFIRMED
                              </span>
                            )}

                            <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                              <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
                              {roomInfo.name}
                            </span>
                          </div>

                          <h3 className="text-base font-black text-slate-900">
                            {b.society}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                              <span>{formatDisplayDate(startDate)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {formatTimeOnly(startDate)} – {formatTimeOnly(endDate)}
                              </span>
                            </div>
                          </div>

                          {b.purpose && (
                            <p className="text-xs text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-md border border-slate-100 mt-1">
                              <span className="font-semibold text-slate-700">Agenda:</span> {b.purpose}
                            </p>
                          )}
                        </div>

                        {/* Cancel Button */}
                        {canCancel && (
                          <div className="sm:self-center shrink-0">
                            <button
                              onClick={() => setCancelModalBooking(b)}
                              className="w-full sm:w-auto px-3.5 py-2 rounded-lg border border-slate-900 text-slate-900 text-xs font-bold hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                            >
                              Cancel Booking
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PAST & CANCELLED BOOKINGS */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-slate-400" />
                <h2 className="text-base font-bold text-slate-600 tracking-tight">
                  Past & Cancelled Bookings
                </h2>
                <span className="text-[10px] font-bold px-2 py-0.2 bg-slate-100 text-slate-600 rounded-md">
                  {pastBookings.length}
                </span>
              </div>

              {pastBookings.length === 0 ? (
                <div className="bg-white/60 rounded-xl p-6 border border-slate-200/60 text-center text-slate-400 text-xs">
                  No past or cancelled bookings recorded.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pastBookings.map((b) => {
                    const startDate = new Date(b.starts_at);
                    const isCancelled = b.status === "cancelled";
                    const roomInfo = getRoomConfig(b.room);

                    return (
                      <div
                        key={b.id}
                        className="bg-white/70 rounded-xl p-3.5 border border-slate-200/60 flex items-center justify-between gap-3 text-xs opacity-80"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-700">{b.society}</span>
                            <span className="text-[11px] text-slate-400 font-medium">({roomInfo.name})</span>
                            {isCancelled && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-red-100 text-red-700 rounded">
                                Cancelled
                              </span>
                            )}
                          </div>
                          <span className="text-slate-400 text-[11px] mt-0.5 block">
                            {formatDisplayDate(startDate)} • {formatTimeOnly(startDate)}
                          </span>
                        </div>

                        <span className="text-[11px] text-slate-400 font-medium">
                          {isCancelled ? "Slot Released" : "Completed"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Policies & Guidelines (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            
            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs text-slate-800">
              <h3 className="font-extrabold text-sm text-slate-900 mb-3 flex items-center gap-2">
                Booking Guidelines
              </h3>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </div>
                  <p>
                    <strong className="text-slate-800">Advance Cancellation:</strong> Cancellations must be made in advance if your society no longer requires the slot to free it for others.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </div>
                  <p>
                    <strong className="text-slate-800">Cleanliness & Protocol:</strong> Ensure the room is left clean, projector/lights turned off, and furniture organized after your booking period.
                  </p>
                </div>

                <div className="flex items-start gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </div>
                  <p>
                    <strong className="text-slate-800">Urgent Support:</strong> For room keys, technical issues, or emergency rescheduling, contact the Student Activity Centre (SAC) Gymkhana office.
                  </p>
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

      {/* Cancel Confirmation Modal */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-slate-100 text-slate-900 animate-in zoom-in-95">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black tracking-tight text-slate-900">
                Confirm Cancellation
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to cancel the booking for{" "}
              <strong className="text-slate-900">{cancelModalBooking.society}</strong> in{" "}
              <strong>{getRoomConfig(cancelModalBooking.room).name}</strong> on{" "}
              <strong>{formatDisplayDate(new Date(cancelModalBooking.starts_at))}</strong> (
              {formatTimeOnly(new Date(cancelModalBooking.starts_at))} –{" "}
              {formatTimeOnly(new Date(cancelModalBooking.ends_at))})? The slot will immediately become available for other societies.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setCancelModalBooking(null)}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              >
                {isCancelling ? "Cancelling..." : "Yes, Cancel Slot"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navy Footer with WebD attribution */}
      <Footer />
    </div>
  );
}
