"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Calendar, BookmarkCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isAllowedBooker } from "@/lib/config";

interface NavbarProps {
  userEmail?: string | null;
  userName?: string | null;
  userAvatar?: string | null;
}

export default function Navbar({ userEmail, userName, userAvatar }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const canBook = isAllowedBooker(userEmail);

  const handleSignOut = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } catch {
      setIsLoggingOut(false);
    }
  };

  const displayName = userName || (userEmail ? userEmail.split("@")[0] : "Student");
  const displayEmail = userEmail || "user@iitbbs.ac.in";

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-slate-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
        
        {/* Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 relative shrink-0">
              <Image
                src="/Gymkhana logo.svg"
                alt="Gymkhana Logo"
                width={36}
                height={36}
                className="object-contain transition-transform group-hover:scale-105"
              />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-sm sm:text-base tracking-tight text-slate-900 leading-tight">
                SAC Gymkhana
              </span>
              <span className="hidden sm:inline text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                IIT Bhubaneswar
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Tabs (Only show My Bookings for allow-listed secretaries) */}
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/dashboard"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              pathname === "/dashboard"
                ? "text-blue-600 bg-blue-50 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
            }`}
          >
            <Calendar className="w-4 h-4 shrink-0" />
            <span className="hidden xs:inline sm:inline">Schedule</span>
          </Link>

          {canBook && (
            <Link
              href="/my-bookings"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                pathname === "/my-bookings"
                  ? "text-blue-600 bg-blue-50 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/70"
              }`}
            >
              <BookmarkCheck className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">My Bookings</span>
            </Link>
          )}
        </nav>

        {/* User Profile & Logout */}
        <div className="relative flex items-center shrink-0">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2.5 p-1 sm:p-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left focus:outline-none cursor-pointer"
            aria-expanded={showMenu}
          >
            <div className="hidden md:flex flex-col text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="text-xs font-bold text-slate-800 leading-none">
                  {displayName}
                </span>
                {canBook ? (
                  <span className="text-[9px] font-black uppercase px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded">
                    Secretary
                  </span>
                ) : (
                  <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                    Student
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-500 truncate max-w-[160px] leading-tight">
                {displayEmail}
              </span>
            </div>

            {userAvatar ? (
              <Image
                src={userAvatar}
                alt={displayName}
                width={36}
                height={36}
                unoptimized
                referrerPolicy="no-referrer"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full ring-2 ring-slate-200 object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-slate-200 shrink-0">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </button>

          {/* User dropdown menu */}
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-12 z-50 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 text-slate-800 animate-in fade-in zoom-in-95">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{displayName}</p>
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                      {canBook ? "Secretary" : "Student"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
                </div>

                {canBook && (
                  <Link
                    href="/my-bookings"
                    onClick={() => setShowMenu(false)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <BookmarkCheck className="w-4 h-4 text-slate-500" />
                    <span>My Bookings</span>
                  </Link>
                )}

                <button
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            </>
          )}
        </div>

      </div>
    </header>
  );
}
