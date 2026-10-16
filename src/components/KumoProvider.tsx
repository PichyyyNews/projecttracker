"use client";

import { IconContext } from "@phosphor-icons/react";
import React from "react";

export function KumoProvider({ children }: { children: React.ReactNode }) {
  return (
    <IconContext.Provider value={{ weight: "thin" }}>
      <div data-mode="light" className="min-h-screen bg-kumo-canvas text-kumo-default antialiased text-sm">
        {children}
      </div>
    </IconContext.Provider>
  );
}
