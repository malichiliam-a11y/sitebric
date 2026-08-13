"use client";

import { useState } from "react";
import { palette } from "@/lib/design";
import DemoPanel from "./DemoPanel";
import AuthCard from "./AuthCard";

// The hero's single card slot does double duty: a first-time visitor
// lands on the live demo generator by default (the actual product,
// working, before any signup), with sign-in/sign-up one click away
// rather than a separate page. AuthCard is left completely untouched —
// this just decides which of the two cards occupies the slot.
export default function HeroPanel() {
  const [panel, setPanel] = useState<"demo" | "auth">("demo");

  if (panel === "auth") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
        <AuthCard />
        <span
          className="sb-link"
          style={{ marginTop: 20, fontSize: 13.5, color: palette.textMuted }}
          onClick={() => setPanel("demo")}
        >
          ← Try the live demo instead
        </span>
      </div>
    );
  }

  return <DemoPanel onWantAccount={() => setPanel("auth")} />;
}
