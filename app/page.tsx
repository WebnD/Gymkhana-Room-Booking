"use client";

import { Suspense, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AlertCircle, Lock, ArrowRight, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { User } from "@supabase/supabase-js";

function LandingCard() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === "unauthorized_domain"
      ? "Access restricted: Only institutional @iitbbs.ac.in Google accounts are authorized."
      : errorParam === "auth_failed"
      ? "Authentication failed. Please try again with your IIT Bhubaneswar account."
      : null
  );

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const supabase = createClient();

      const redirectUrl = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            hd: "iitbbs.ac.in",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
      }
    } catch {
      setErrorMessage("An unexpected error occurred during sign-in.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 sm:p-10 border border-white/20 text-slate-900 transition-all">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 rounded-full">
            Room Booking
          </span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
          Meeting Room A
        </h2>
        <div className="w-16 h-1 bg-slate-900 mt-2 mb-4 rounded-full"></div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Sign in with your{" "}
          <span className="inline-block px-1.5 py-0.5 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
            @iitbbs.ac.in
          </span>{" "}
          institutional account to view the live schedule and reserve rooms.
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="mb-6 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700 text-xs leading-relaxed animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* If already logged in: Go to Dashboard Button */}
      {user ? (
        <div className="space-y-4">
          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 font-medium">
            Signed in as <strong>{user.email}</strong>
          </div>
          <Link
            href="/dashboard"
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl font-extrabold text-sm text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] transition-all shadow-md hover:shadow-lg"
          >
            <span>GO TO DASHBOARD</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        /* Google Login Button */
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full relative flex items-center justify-center gap-3 py-3.5 px-6 border-2 border-slate-900 rounded-2xl font-bold text-sm text-slate-900 bg-white hover:bg-slate-50 active:scale-[0.99] transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
          )}
          <span>{isLoading ? "CONNECTING..." : "SIGN IN WITH GOOGLE"}</span>
        </button>
      )}

      {/* Dashed separator */}
      <div className="my-6 border-t-2 border-dashed border-slate-200"></div>

      {/* Security guarantee */}
      <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-bold tracking-wider uppercase">
        <Lock className="w-3.5 h-3.5 text-slate-400" />
        <span>Secure Institutional Login</span>
      </div>

      {/* Policy disclaimer */}
      <p className="text-[11px] text-slate-400 text-center mt-4 leading-normal">
        By signing in, you agree to the{" "}
        <span className="font-semibold text-slate-600">Booking Policy</span> and{" "}
        <span className="font-semibold text-slate-600">Terms of Service</span>.
      </p>
    </div>
  );
}

export default function RootLandingPage() {
  const currentYear = new Date().getFullYear();

  return (
    <main className="relative min-h-screen flex flex-col justify-between bg-slate-950 overflow-hidden text-white selection:bg-yellow-400 selection:text-black">
      
      {/* Background: SAC Building Photo with Atmospheric Dark Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/sac_bg.jpg"
          alt="Student Activity Centre (SAC) Building, IIT Bhubaneswar"
          fill
          className="object-cover object-center filter brightness-[0.38] contrast-125"
          priority
        />
        {/* Deep dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/75 to-slate-950/85" />
        <div className="absolute inset-0 bg-radial from-transparent via-slate-950/50 to-slate-950/95" />
      </div>

      {/* Top Institutional Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold tracking-wider text-slate-300 uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>IIT Bhubaneswar • Facility Management</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full backdrop-blur-md">
          <span>Academic Year 2026–27</span>
        </div>
      </header>

      {/* Main Hero Content Area */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 my-auto">
        
        {/* Left Side: Branding & SAC Identity */}
        <div className="flex-1 text-white flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          
          {/* Gymkhana Crest without box */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 relative drop-shadow-2xl">
            <Image
              src="/Gymkhana logo.svg"
              alt="Gymkhana Crest"
              width={112}
              height={112}
              className="object-contain"
              priority
            />
          </div>

          {/* Titles: STUDENT ACTIVITY CENTRE in ONE single line */}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight uppercase leading-tight drop-shadow-lg whitespace-normal lg:whitespace-nowrap">
              Student Activity Centre
            </h1>
            <p className="text-2xl sm:text-3xl font-black tracking-widest text-[#D4AF37] uppercase drop-shadow-md">
              GYMKHANA
            </p>
          </div>

          {/* IIT Bhubaneswar Badge */}
          <div className="inline-flex items-center gap-3 bg-slate-900/90 border border-slate-700/80 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl">
            <div className="w-7 h-7 relative shrink-0">
              <Image
                src="/IITBHUBANESWAR_logo.svg"
                alt="IIT Bhubaneswar"
                width={28}
                height={28}
                className="object-contain"
              />
            </div>
            <span className="text-xs sm:text-sm font-bold text-white tracking-wide">
              IIT Bhubaneswar
            </span>
          </div>

          {/* Feature Highlights */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-2 text-xs font-semibold text-slate-300">
            <span className="inline-flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              09:00 AM – 03:00 AM
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Exclusion Verified
            </span>
            <span className="inline-flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-xl backdrop-blur-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              1-Hour Granularity
            </span>
          </div>

        </div>

        {/* Right Side: Login Box */}
        <div className="flex-1 flex justify-center lg:justify-end w-full">
          <Suspense
            fallback={
              <div className="w-full max-w-md h-80 bg-white/10 rounded-3xl animate-pulse" />
            }
          >
            <LandingCard />
          </Suspense>
        </div>
      </div>

      {/* Footer on Landing Page */}
      <footer className="relative z-10 w-full bg-[#081225]/90 backdrop-blur-md border-t border-slate-800/80 py-5 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          
          <p>© {currentYear} Gymkhana, IIT Bhubaneswar. All rights reserved.</p>

          <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-full shadow-inner">
            <div className="w-4 h-4 relative shrink-0">
              <Image
                src="/WebnD.png"
                alt="Web & Coding Club Logo"
                width={16}
                height={16}
                className="object-contain rounded-full"
              />
            </div>
            <p className="text-[11px] font-medium text-slate-300">
              Crafted by <span className="font-bold text-blue-400">WebD</span> • Web & Coding Club
            </p>
          </div>

        </div>
      </footer>

    </main>
  );
}
