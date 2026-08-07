"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import { captureReferralCode } from "@/lib/referral";
import { palette, metrics } from "@/lib/design";
import TerrainCanvas from "./TerrainCanvas";
import { FilmGrain } from "./primitives";
import { TopNav, BottomBar } from "./Chrome";
import HeroCopy from "./HeroCopy";
import AuthCard from "./AuthCard";

export default function LoginScreen() {
  const router = useRouter();

  useEffect(() => {
    captureReferralCode();
    (async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) router.push("/dashboard");
    })();
  }, [router]);

  return (
    <div className="sb-login">
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .sb-login {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          position: relative;
          overflow: hidden;
          background: ${palette.bg};
          color: ${palette.text};
          font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .sb-toggle {
          width: 40px; height: 40px;
          border-radius: 10px;
          border: 1px solid ${palette.hairline};
          background: rgba(255,255,255,0.02);
          display: flex; align-items: center; justify-content: center;
          color: ${palette.textMuted};
        }

        .sb-tile {
          width: ${metrics.featureTile}px; height: ${metrics.featureTile}px; flex-shrink: 0;
          border-radius: ${metrics.featureTileRadius}px;
          border: 1px solid ${palette.hairline};
          background: ${palette.tile};
          display: flex; align-items: center; justify-content: center;
          color: ${palette.text};
          transition: border-color 220ms cubic-bezier(0.22,1,0.36,1),
                      background 220ms cubic-bezier(0.22,1,0.36,1);
        }
        .sb-feature:hover .sb-tile {
          border-color: rgba(255,255,255,0.16);
          background: rgba(255,255,255,0.055);
        }

        /* The reference keeps the terrain to the left of centre. */
        .sb-art-stage {
          position: absolute;
          left: 5%; right: 32%; top: 26%; bottom: 14%;
        }
        /* Veils both edges: the copy column on the left and the card
           column on the right both sit on clean black in the reference. */
        .sb-art-veil {
          position: absolute; inset: 0; pointer-events: none;
          background:
            linear-gradient(90deg,
              ${palette.bg} 0%,
              ${palette.bg} 8%,
              rgba(5,5,5,0.78) 18%,
              rgba(5,5,5,0.28) 31%,
              rgba(5,5,5,0) 44%),
            linear-gradient(270deg,
              ${palette.bg} 0%,
              rgba(5,5,5,0.96) 10%,
              rgba(5,5,5,0.7) 19%,
              rgba(5,5,5,0) 31%),
            linear-gradient(0deg,
              ${palette.bg} 0%,
              rgba(5,5,5,0.7) 8%,
              rgba(5,5,5,0) 22%);
        }

        @media (prefers-reduced-motion: reduce) {
          .sb-tile { transition: none; }
        }
        @media (max-width: 1040px) {
          .sb-grid { grid-template-columns: 1fr !important; justify-items: center;
                     padding: 0 5% 28px !important; }
          .sb-copy { display: none !important; }
          .sb-footer { flex-direction: column !important; gap: 20px !important; text-align: center; }
          .sb-footer-links { gap: 26px !important; flex-wrap: wrap; justify-content: center; }
          .sb-art { opacity: 0.45; }
        }
        @media (max-width: 720px) {
          .sb-nav { padding: 22px 6% !important; }
          .sb-nav a { display: none; }
        }
      `,
        }}
      />

      {/* ---- background composition ---- */}
      <div className="sb-art" style={{ position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none" }}>
        <div className="sb-art-stage">
          <TerrainCanvas className="absolute inset-0 h-full w-full" />
        </div>
        <div className="sb-art-veil" />
      </div>
      <FilmGrain opacity={0.035} />

      <TopNav />

      <div
        className="sb-grid"
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
          padding: `0 ${metrics.gutterRight} 30px ${metrics.gutterLeft}`,
          display: "grid",
          gridTemplateColumns: `1fr ${metrics.cardWidth}px`,
          gap: 56,
          alignItems: "center",
        }}
      >
        <HeroCopy />
        <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
          <AuthCard />
        </div>
      </div>

      <BottomBar />
    </div>
  );
}
