"use client";

// Fixtures for the domain-status harness. See page.js for why this exists.

import { useState } from "react";
import DomainStatus from "../../dashboard/DomainStatus";
import { domainStatus } from "@/lib/domain-status";

const verified = { verified: true };

const CASES = {
  live: domainStatus({
    domain: "yudawireless.com",
    domainInfo: verified,
    configInfo: { misconfigured: false },
  }),
  waiting: domainStatus({
    domain: "yudawireless.com",
    domainInfo: verified,
    configInfo: {
      misconfigured: true,
      nameservers: ["dns1.registrar-servers.com", "dns2.registrar-servers.com"],
    },
  }),
  propagating: domainStatus({
    domain: "yudawireless.com",
    domainInfo: verified,
    configInfo: {
      misconfigured: true,
      nameservers: ["ns1.vercel-dns.com", "ns2.vercel-dns.com"],
    },
  }),
  verify: domainStatus({
    domain: "yudawireless.com",
    domainInfo: {
      verified: false,
      verification: [
        { type: "TXT", domain: "_vercel.yudawireless.com", value: "vc-domain-verify=abc123" },
      ],
    },
    configInfo: { misconfigured: true },
  }),
  unknown: domainStatus({ domain: "yudawireless.com", domainInfo: null, configInfo: null }),
};

export default function Harness({ state }) {
  const [copied, setCopied] = useState("");
  // Records what the panel hands upward. In the dashboard this callback
  // writes to the clipboard; here it only needs to prove the panel passed
  // the right string, which is the component's actual contract.
  function record(text) {
    if (typeof window !== "undefined") {
      window.__copied = [...(window.__copied || []), text];
    }
    setCopied(text);
  }
  return (
    <div style={{ background: "#08080C", minHeight: "100vh", padding: 24 }}>
      <DomainStatus
        status={CASES[state] || CASES.waiting}
        slug="yudawireless"
        busy={false}
        copied={copied}
        onRecheck={() => {}}
        onCopy={record}
      />
    </div>
  );
}
