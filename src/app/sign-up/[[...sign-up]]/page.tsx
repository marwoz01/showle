import { SignUp } from "@clerk/nextjs";
import { Clapperboard } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-[85vh] items-center justify-center">
      <div className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-white/6 bg-card shadow-2xl">
        {/* Left decorative panel */}
        <div className="relative hidden w-5/12 overflow-hidden lg:block">
          <div className="absolute inset-0 bg-[#0d0a18]" />
          <div className="animate-blob-1 absolute -left-10 top-1/4 h-80 w-80 rounded-full bg-accent-purple/40 blur-[80px]" />
          <div className="animate-blob-2 absolute -right-10 bottom-1/4 h-72 w-72 rounded-full bg-[#5b21b6]/50 blur-[70px]" />
          <div className="animate-blob-3 absolute left-1/3 top-1/2 h-64 w-64 rounded-full bg-accent-purple/20 blur-[60px]" />
          <div className="animate-blob-4 absolute left-1/2 top-0 h-56 w-56 rounded-full bg-[#a855f7]/30 blur-[60px]" />
          <div className="relative flex h-full flex-col justify-end p-10">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Clapperboard size={20} className="text-white" />
            </div>
            <h2 className="mb-2 font-display text-3xl font-bold text-white">
              Showle
            </h2>
            <p className="text-sm text-white/60">
              Daily movie & series guessing game
            </p>
          </div>
        </div>

        {/* Right panel with Clerk SignUp */}
        <div className="flex w-full items-center justify-center p-8 lg:w-7/12 lg:p-12">
          <SignUp />
        </div>
      </div>
    </div>
  );
}
