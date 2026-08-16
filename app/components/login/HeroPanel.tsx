"use client";

import { useState } from "react";
import { palette } from "@/lib/design";
import DemoPanel from "./DemoPanel";
import AuthCard from "./AuthCard";

// The hero's single card slot holds either the sign-in form or the live
// demo generator. Both / and /login open on the form; the demo is reached
// from "Try it live" in the nav or the link under the card. AuthCard and
// DemoPanel are both untouched — this only decides which one occupies the
// slot, so either can be made the front door by changing a prop.
//
// The default used to be the demo on every route, which made "Log in" on
// /demo a loop: it navigated to /login and dropped the visitor back on the
// demo they were trying to leave, with no route to the form at all.
export default function HeroPanel({ initialPanel = "demo" }: { initialPanel?: "demo" | "auth" }) {
  const [panel, setPanel] = useState<"demo" | "auth">(initialPanel);

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
