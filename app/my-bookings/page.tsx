"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Booking, ROOM_CONFIG, isAllowedBooker } from "@/lib/config";
import { createClient } from "@/lib/supabase/client";
import {
  Calendar as CalendarIcon,
  Clock,
  History,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  AlertTriangle,
} from "lucide-react";
import { formatDisplayDate, formatTimeOnly } from "@/lib/calendar-utils";
import { getSocietyTheme } from "@/lib/society-colors";
import { User } from "@supabase/supabase-js";

export default function MyBookingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [referenceTime, setReferenceTime] = useState<number>(0);

  const fetchMyBookings = useCallback(async (userEmail: string) => {
    try {
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("booked_by_email", userEmail.toLowerCase())
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
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
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
  }, [fetchMyBookings, router]);

  const handleConfirmCancel = async () => {
    if (!cancelModalBooking || !user?.email) return;

    try {
      setIsCancelling(true);
      setActionError(null);
      setActionSuccess(null);

      const supabase = createClient();
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", cancelModalBooking.id);

      if (error) {
        setActionError(error.message || "Failed to cancel booking.");
        setIsCancelling(false);
        return;
      }

      setActionSuccess(`Booking for ${cancelModalBooking.society} has been cancelled.`);
      setCancelModalBooking(null);
      setIsCancelling(false);
      fetchMyBookings(user.email);
    } catch {
      setActionError("An unexpected error occurred.");
      setIsCancelling(false);
    }
  };

  const upcomingBookings = myBookings.filter(
    (b) => b.status === "booked" && (referenceTime === 0 || new Date(b.ends_at).getTime() >= referenceTime)
  );

  const pastBookings = myBookings.filter(
    (b) =>
      b.status === "cancelled" || (referenceTime > 0 && new Date(b.ends_at).getTime() < referenceTime)
  );

  const userEmail = user?.email ?? null;
  const userName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    (userEmail ? userEmail.split("@")[0] : "Student");
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      {/* Navbar */}
      <Navbar
        userEmail={userEmail}
        userName={userName}
        userAvatar={userAvatar}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            My Bookings
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage and view your upcoming and past room reservations.
          </p>
        </div>

        {/* Action alerts */}
        {actionSuccess && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-medium animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="flex-1">{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-500 hover:text-emerald-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {actionError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 text-xs font-medium animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <span className="flex-1">{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2-Column Layout matching Screen 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Bookings Lists (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* UPCOMING BOOKINGS */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CalendarIcon className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Upcoming Bookings
                </h2>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-28 bg-white rounded-2xl animate-pulse border border-slate-200/80" />
                  <div className="h-28 bg-white rounded-2xl animate-pulse border border-slate-200/80" />
                </div>
              ) : upcomingBookings.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 border border-slate-200/80 text-center text-slate-500 shadow-xs">
                  <CalendarIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-700 text-sm">No upcoming bookings</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Bookings made for future dates will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingBookings.map((b) => {
                    const startDate = new Date(b.starts_at);
                    const endDate = new Date(b.ends_at);
                    const theme = getSocietyTheme(b.society);

                    return (
                      <div
                        key={b.id}
                        className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${theme.badgeBg} ${theme.badgeText} rounded-md`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${theme.dotColor === 'bg-amber-500' ? 'bg-slate-900' : 'bg-white'}`} />
                              CONFIRMED
                            </span>
                            <span className="text-xs font-bold text-slate-400 uppercase">
                              {ROOM_CONFIG.name}
                            </span>
                          </div>

                          <h3 className="text-lg font-black text-slate-900">
                            {b.society}
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
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
                            <p className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 mt-1">
                              <span className="font-semibold text-slate-700">Agenda:</span> {b.purpose}
                            </p>
                          )}
                        </div>

                        {/* Cancel Button */}
                        <div className="sm:self-center shrink-0">
                          <button
                            onClick={() => setCancelModalBooking(b)}
                            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border-2 border-slate-900 text-slate-900 text-xs font-bold hover:bg-slate-900 hover:text-white transition-all cursor-pointer"
                          >
                            Cancel Booking
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* PAST BOOKINGS */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-slate-500" />
                <h2 className="text-lg font-black text-slate-900 tracking-tight">
                  Past Bookings
                </h2>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  <div className="h-24 bg-white rounded-2xl animate-pulse border border-slate-200/80" />
                </div>
              ) : pastBookings.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-slate-200/80 text-center text-slate-400 text-xs shadow-xs">
                  No past or cancelled bookings recorded.
                </div>
              ) : (
                <div className="space-y-4">
                  {pastBookings.map((b) => {
                    const startDate = new Date(b.starts_at);
                    const endDate = new Date(b.ends_at);
                    const isCancelled = b.status === "cancelled";

                    return (
                      <div
                        key={b.id}
                        className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-80 hover:opacity-100 transition-opacity"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide rounded-md ${
                                isCancelled
                                  ? "bg-red-100 text-red-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {isCancelled ? "CANCELLED" : "COMPLETED"}
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {ROOM_CONFIG.name}
                            </span>
                          </div>

                          <h3 className="text-base font-bold text-slate-800">
                            {b.society}
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                            <span>📅 {formatDisplayDate(startDate)}</span>
                            <span>
                              ⏰ {formatTimeOnly(startDate)} – {formatTimeOnly(endDate)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Booking Guidelines Card (4 cols, matching Screen 2) */}
          <div className="lg:col-span-4" id="guidelines">
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs text-slate-800 sticky top-24">
              <h3 className="text-base font-black text-slate-900 tracking-tight mb-4">
                Booking Guidelines
              </h3>

              <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-800">Advance Cancellation:</strong>{" "}
                    Cancellations must be made in advance if your society no longer requires the slot to free it for others.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-800">Cleanliness & Protocol:</strong>{" "}
                    Ensure the meeting room is left clean, projector/lights turned off, and furniture organized after your booking period.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p>
                    <strong className="text-slate-800">Urgent Support:</strong>{" "}
                    For room keys, technical issues, or emergency rescheduling, contact the Student Activity Centre (SAC) Gymkhana office.
                  </p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Confirmation Modal for Cancelling */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-slate-900">
            <div className="flex items-center gap-3 mb-4 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-black tracking-tight text-slate-900">
                Cancel Room Booking?
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to cancel the booking for{" "}
              <strong className="text-slate-900">{cancelModalBooking.society}</strong> on{" "}
              <strong>{formatDisplayDate(new Date(cancelModalBooking.starts_at))}</strong> (
              {formatTimeOnly(new Date(cancelModalBooking.starts_at))} –{" "}
              {formatTimeOnly(new Date(cancelModalBooking.ends_at))})? The slot will immediately become available for other societies.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCancelModalBooking(null)}
                disabled={isCancelling}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all flex items-center gap-2"
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
