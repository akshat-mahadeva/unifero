"use client";
// Disable unused warnings for commented-out code
import React from "react";
import { SidebarTrigger } from "../ui/sidebar";

interface ChatHeaderProps {
  isHomePage?: boolean;
  sessionId?: string;
  sessionTitle?: string;
}

const DeepSearchHeader = ({ isHomePage = false }: ChatHeaderProps) => {
  if (isHomePage) {
    return (
      <div className="flex items-center gap-4 p-3">
        <SidebarTrigger className=" h-8 w-8" />
      </div>
    );
  }

  // Simple Header
  return (
    <div className="flex items-center gap-4 p-3">
      <SidebarTrigger className=" h-8 w-8" />
    </div>
  );
};

export default DeepSearchHeader;
