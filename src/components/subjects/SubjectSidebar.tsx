"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { BookOpen, Clock3, Layers, LogOut, X } from "lucide-react";
import type { Subject } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function SubjectSidebar({
  subjects,
  email,
  isOpen = false,
  onClose,
}: {
  subjects: Subject[];
  email?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selected = searchParams.get("subject");
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      {isOpen ? (
        <div
          className="fixed inset-0 z-30 cursor-pointer bg-black/60 lg:hidden"
          onClick={onClose}
          role="button"
          tabIndex={-1}
        />
      ) : null}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[#2e2e2e] bg-[#111111] p-5 transition-transform lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="mb-6 flex items-center justify-between gap-2 text-white">
          <div className="flex items-center gap-2">
            <Layers className="size-5 text-indigo-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wide">Subjects</h2>
          </div>
          <button
            className="grid size-8 place-items-center rounded-md border border-[#2e2e2e] text-neutral-300 transition hover:border-indigo-500 hover:text-white lg:hidden"
            onClick={onClose}
            title="Close sidebar"
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        <nav className="space-y-2">
          <Link
            className={cn(
              "flex min-h-11 items-center gap-2 rounded-md border-l-2 px-3 text-sm transition",
              pathname === "/revision"
                ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
                : "border-transparent text-neutral-300 hover:bg-[#1a1a2e] hover:text-white",
            )}
            href="/revision"
          >
            <Clock3 className="size-4 text-indigo-400" />
            Revision timer
          </Link>
          <SubjectLink
            href="/"
            isActive={!selected}
            name="All Notes"
            color="#0f172a"
            count={subjects.reduce((sum, subject) => sum + (subject.note_count ?? 0), 0)}
          />
          {subjects.map((subject) => (
            <SubjectLink
              key={subject.id}
              href={`/?subject=${subject.id}`}
              isActive={selected === subject.id}
              name={subject.name}
              color={subject.color}
              count={subject.note_count ?? 0}
            />
          ))}
        </nav>

        <div className="mt-auto border-t border-[#2e2e2e] pt-4">
          <p className="truncate text-xs text-neutral-400">{email ?? "Signed in"}</p>
          <button
            className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[#2e2e2e] bg-[#1a1a2e] px-3 text-sm text-neutral-300 transition hover:border-indigo-500 hover:text-white active:scale-[0.99]"
            onClick={signOut}
            title={email ?? "Sign out"}
            type="button"
          >
            <LogOut className="size-4" />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function SubjectLink({
  href,
  isActive,
  name,
  color,
  count,
}: {
  href: string;
  isActive: boolean;
  name: string;
  color: string;
  count: number;
}) {
  return (
    <Link
      className={cn(
        "relative flex min-h-11 items-center justify-between rounded-md border-l-2 px-3 text-sm transition",
        isActive
          ? "border-indigo-500 bg-indigo-500/10 text-indigo-200"
          : "border-transparent text-neutral-300 hover:bg-[#1a1a2e] hover:text-white",
      )}
      href={href}
    >
      {isActive ? (
        <motion.span
          className="absolute inset-0 rounded-md border border-cyan-300/40"
          layoutId="subject-active"
          transition={{ type: "spring", bounce: 0.18, duration: 0.45 }}
        />
      ) : null}
      <span className="relative flex min-w-0 items-center gap-2">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
        {isActive ? <span className="truncate">{name}</span> : <span className="truncate">{name}</span>}
      </span>
      <span
        className={cn(
          "relative rounded-full px-2 py-0.5 text-xs",
          isActive ? "bg-indigo-500/20 text-indigo-100" : "bg-[#1a1a2e] text-neutral-300",
        )}
      >
        {count}
      </span>
    </Link>
  );
}

export function MobileSubjectTabs({ subjects }: { subjects: Subject[] }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const selected = searchParams.get("subject");

  return (
    <div className="flex gap-2 overflow-x-auto border-b border-[#2e2e2e] bg-[#0f0f0f] px-4 py-3 lg:hidden">
      <Link className={tabClass(pathname === "/revision")} href="/revision">
        <Clock3 className="size-4" />
        Timer
      </Link>
      <Link className={tabClass(!selected)} href="/">
        <BookOpen className="size-4" />
        All
      </Link>
      {subjects.map((subject) => (
        <Link className={tabClass(selected === subject.id)} href={`/?subject=${subject.id}`} key={subject.id}>
          <span className="size-2 rounded-full" style={{ backgroundColor: subject.color }} />
          <span className="truncate">{subject.name}</span>
        </Link>
      ))}
    </div>
  );
}

function tabClass(active: boolean) {
  return cn(
    "flex h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm",
    active ? "border-indigo-500 bg-indigo-600 text-white" : "border-[#2e2e2e] bg-[#1a1a2e] text-neutral-300",
  );
}
