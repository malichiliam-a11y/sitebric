"use client";

import { motion } from "framer-motion";
import type { InputHTMLAttributes, ReactNode } from "react";
import { palette, metrics, easing } from "@/lib/design";
import { IconArrowRight } from "./primitives";

/* --------------------------------------------------------------- field */

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  affix?: ReactNode;
};

export function Field({ label, affix, id, ...rest }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontSize: 14,
          fontWeight: 500,
          letterSpacing: "-0.005em",
          color: palette.text,
          marginBottom: 10,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <input id={id} className="sb-field" {...rest} />
        {affix}
      </div>
    </div>
  );
}

export function Affix({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick?: () => void;
  label?: string;
}) {
  const interactive = Boolean(onClick);
  return (
    <span
      className={interactive ? "sb-affix sb-affix--btn" : "sb-affix"}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={label}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

/* ----------------------------------------------------------- primary cta */

export function PrimaryButton({
  children,
  loading,
  ...rest
}: { children: ReactNode; loading?: boolean } & InputHTMLAttributes<HTMLButtonElement>) {
  return (
    <motion.button
      type="submit"
      className="sb-cta"
      disabled={loading}
      whileHover={loading ? undefined : { y: -1 }}
      whileTap={loading ? undefined : { scale: 0.994 }}
      transition={{ duration: 0.18, ease: easing }}
      {...(rest as object)}
    >
      <span>{children}</span>
      {!loading && (
        <span className="sb-cta-arrow">
          <IconArrowRight size={17} />
        </span>
      )}
    </motion.button>
  );
}

/* --------------------------------------------------------- secondary cta */

export function SecondaryButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      className="sb-oauth"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.994 }}
      transition={{ duration: 0.18, ease: easing }}
    >
      {children}
    </motion.button>
  );
}

/* -------------------------------------------------------------- checkbox */

export function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontSize: 13.5,
        color: palette.textMuted,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {/* Native input restyled rather than replaced, so it stays
          keyboard- and screen-reader-addressable. */}
      <input
        type="checkbox"
        className="sb-check"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {children}
    </label>
  );
}

/* ------------------------------------------------------- shared card CSS */

export const controlCss = `
  .sb-field {
    width: 100%;
    height: ${metrics.controlHeight}px;
    box-sizing: border-box;
    padding: 0 46px 0 16px;
    border-radius: ${metrics.controlRadius}px;
    border: 1px solid ${palette.hairlineStrong};
    background: ${palette.input};
    color: ${palette.text};
    font-family: inherit;
    font-size: 14.5px;
    outline: none;
    transition: border-color 180ms cubic-bezier(0.22,1,0.36,1),
                background 180ms cubic-bezier(0.22,1,0.36,1);
  }
  .sb-field::placeholder { color: ${palette.textGhost}; }
  .sb-field:hover { border-color: rgba(255,255,255,0.18); }
  .sb-field:focus {
    border-color: ${palette.hairlineFocus};
    background: rgba(255,255,255,0.04);
  }

  .sb-affix {
    position: absolute; right: 16px; top: 50%; transform: translateY(-50%);
    display: flex; color: ${palette.textGhost}; pointer-events: none;
    transition: color 180ms cubic-bezier(0.22,1,0.36,1);
  }
  .sb-affix--btn { pointer-events: auto; cursor: pointer; }
  .sb-affix--btn:hover { color: ${palette.textMuted}; }

  .sb-cta {
    position: relative;
    width: 100%;
    height: ${metrics.controlHeight}px;
    display: flex; align-items: center; justify-content: center;
    border: none; border-radius: ${metrics.controlRadius}px;
    background: #FFFFFF; color: #0A0A0A;
    font-family: inherit; font-size: 15px; font-weight: 600;
    letter-spacing: -0.01em; cursor: pointer;
  }
  .sb-cta:disabled { cursor: default; opacity: 0.55; }
  .sb-cta-arrow {
    position: absolute; right: 18px; display: flex;
    transition: transform 220ms cubic-bezier(0.22,1,0.36,1);
  }
  .sb-cta:hover:not(:disabled) .sb-cta-arrow { transform: translateX(3px); }

  .sb-oauth {
    width: 100%;
    height: ${metrics.controlHeight}px;
    display: flex; align-items: center; justify-content: center; gap: 11px;
    border-radius: ${metrics.controlRadius}px;
    border: 1px solid ${palette.hairlineStrong};
    background: ${palette.input}; color: ${palette.text};
    font-family: inherit; font-size: 15px; font-weight: 500; cursor: pointer;
    transition: border-color 180ms cubic-bezier(0.22,1,0.36,1),
                background 180ms cubic-bezier(0.22,1,0.36,1);
  }
  .sb-oauth:hover { border-color: rgba(255,255,255,0.2); background: rgba(255,255,255,0.05); }

  .sb-check {
    appearance: none; -webkit-appearance: none;
    width: 17px; height: 17px; margin: 0; flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.22); border-radius: 5px;
    background: ${palette.input}; cursor: pointer; position: relative;
    transition: background 150ms ease, border-color 150ms ease;
  }
  .sb-check:hover { border-color: rgba(255,255,255,0.35); }
  .sb-check:checked { background: #FFFFFF; border-color: #FFFFFF; }
  .sb-check:checked::after {
    content: ""; position: absolute; left: 5.5px; top: 2px;
    width: 4px; height: 8px;
    border: solid #0A0A0A; border-width: 0 1.8px 1.8px 0;
    transform: rotate(45deg);
  }

  .sb-link { color: ${palette.textMuted}; cursor: pointer; text-decoration: none;
             transition: color 180ms cubic-bezier(0.22,1,0.36,1); }
  .sb-link:hover { color: ${palette.text}; }
  .sb-link--strong { color: ${palette.text}; font-weight: 500; }
`;
