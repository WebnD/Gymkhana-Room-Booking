import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#081225] text-slate-300 border-t border-slate-800/80 py-8 px-4 sm:px-6 lg:px-8 mt-auto">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left: Brand & Copyright */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 relative shrink-0">
              <Image
                src="/Gymkhana logo.svg"
                alt="Gymkhana"
                width={24}
                height={24}
                className="object-contain brightness-125"
              />
            </div>
            <span className="font-bold text-white text-sm tracking-tight">
              Meeting Room Booking
            </span>
          </div>
          <span className="hidden sm:inline text-slate-600">•</span>
          <p className="text-xs text-slate-400">
            © {currentYear} Gymkhana, IIT Bhubaneswar. All rights reserved.
          </p>
        </div>

        
        {/* Right: Web & Coding Club Attribution */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-full shadow-inner">
          <div className="w-5 h-5 relative shrink-0">
            <Image
              src="/WebnD.png"
              alt="Web & Coding Club Logo"
              width={20}
              height={20}
              className="object-contain rounded-full"
            />
          </div>
          <p className="text-[11px] font-medium text-slate-300">
            Crafted by <span className="font-bold text-blue-400">WebnD</span> • Web & Design Society, IIT Bhubaneswar
          </p>
        </div>

      </div>
    </footer>
  );
}
