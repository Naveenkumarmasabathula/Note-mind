"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { MobileSubjectTabs, SubjectSidebar } from "@/components/subjects/SubjectSidebar";
import type { Subject } from "@/lib/types";

type DashboardShellProps = {
  children: React.ReactNode;
  subjects: Subject[];
  email?: string | null;
  totalNotes: number;
  subjectsCount: number;
};

export function DashboardShell({
  children,
  subjects,
  email,
  totalNotes,
  subjectsCount,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-[#f0f0f0]">
      <SubjectSidebar
        email={email}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        subjects={subjects}
      />
      <div className="flex min-h-screen flex-col lg:pl-72">
        <Header
          onOpenSidebar={() => setSidebarOpen(true)}
          subjectsCount={subjectsCount}
          totalNotes={totalNotes}
        />
        <MobileSubjectTabs subjects={subjects} />
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
