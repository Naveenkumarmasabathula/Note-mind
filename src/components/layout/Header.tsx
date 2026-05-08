"use client";

import { Menu } from "lucide-react";
import BlurText from "@/components/BlurText";
import ShinyText from "@/components/ShinyText";
import { CountingNumber } from "@/components/animate-ui/primitives/texts/counting-number";

type HeaderProps = {
  totalNotes: number;
  subjectsCount: number;
  onOpenSidebar?: () => void;
};

export function Header({ totalNotes, subjectsCount, onOpenSidebar }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#2e2e2e] bg-[#0f0f0f]/85 px-5 py-4 backdrop-blur xl:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              className="grid size-10 place-items-center rounded-md border border-[#2e2e2e] bg-[#111111] text-neutral-300 transition hover:border-indigo-500 hover:text-white lg:hidden"
              onClick={onOpenSidebar}
              title="Open sidebar"
              type="button"
            >
              <Menu className="size-5" />
            </button>
            <ShinyText
              text="NoteMind"
              className="text-3xl font-semibold"
              color="#f0f0f0"
              shineColor="#6366f1"
              speed={3}
            />
            <span className="rounded-full bg-indigo-500/15 px-2.5 py-1 text-xs font-medium text-indigo-200">AI study notes</span>
          </div>
          <BlurText
            text="Turn conversations and manual notes into organized study cards."
            className="mt-1 text-sm text-neutral-400"
            delay={25}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Stat label="Notes" value={totalNotes} />
          <Stat label="Subjects" value={subjectsCount} />
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-24 rounded-md border border-[#2e2e2e] bg-[#1a1a2e] px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-xl font-semibold text-white">
        <CountingNumber number={value} />
      </p>
    </div>
  );
}
