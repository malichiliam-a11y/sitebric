// What a connected domain's status resolves to, given what Vercel said.
//
// The bug this guards against is one-directional: a domain that nobody
// can reach must never read as "live". Every uncertain input below is
// asserted to land on a waiting or unknown state, never on LIVE.
//
//   node test/domain-status.mjs

import assert from "node:assert";
import {
  DOMAIN_STATES,
  VERCEL_NAMESERVERS,
  domainStatus,
  domainMessage,
  showsSetup,
  nameserversPointHere,
} from "../lib/domain-status.js";

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures++;
    console.log(`  FAIL ${name}\n       ${err.message}`);
  }
}

const verified = { verified: true };
const ok = { misconfigured: false };
const notPointing = {
  misconfigured: true,
  nameservers: ["dns1.registrar-servers.com", "dns2.registrar-servers.com"],
};
const pointing = {
  misconfigured: true,
  nameservers: ["ns1.vercel-dns.com", "ns2.vercel-dns.com"],
};

console.log("\nthe states");
{
  check("a domain serving traffic is live", () => {
    const s = domainStatus({ domain: "yudawireless.com", domainInfo: verified, configInfo: ok });
    assert.strictEqual(s.state, DOMAIN_STATES.LIVE);
    assert.strictEqual(s.domain, "yudawireless.com");
  });

  check("registered but pointing at the registrar is waiting, not live", () => {
    const s = domainStatus({ domain: "x.com", domainInfo: verified, configInfo: notPointing });
    assert.strictEqual(s.state, DOMAIN_STATES.WAITING_FOR_DNS);
    assert.strictEqual(s.pointingHere, false);
  });

  check("nameservers changed but not finished is still waiting", () => {
    const s = domainStatus({ domain: "x.com", domainInfo: verified, configInfo: pointing });
    assert.strictEqual(s.state, DOMAIN_STATES.WAITING_FOR_DNS);
    assert.strictEqual(s.pointingHere, true);
  });

  check("a domain held by another account needs its record", () => {
    const s = domainStatus({
      domain: "x.com",
      domainInfo: {
        verified: false,
        verification: [{ type: "TXT", domain: "_vercel.x.com", value: "vc-domain-verify=abc" }],
      },
      configInfo: ok,
    });
    assert.strictEqual(s.state, DOMAIN_STATES.NEEDS_VERIFICATION);
    assert.deepStrictEqual(s.record, {
      type: "TXT",
      name: "_vercel.x.com",
      value: "vc-domain-verify=abc",
    });
  });

  check("no domain connected is its own state", () => {
    assert.strictEqual(domainStatus({ domain: "" }).state, DOMAIN_STATES.NONE);
    assert.strictEqual(domainStatus({}).state, DOMAIN_STATES.NONE);
  });

  check("the domain is normalised", () => {
    const s = domainStatus({ domain: "  YudaWireless.COM ", domainInfo: verified, configInfo: ok });
    assert.strictEqual(s.domain, "yudawireless.com");
  });
}

console.log("\nnothing unreachable is ever called live");
{
  // Each of these is a way Vercel can fail to answer clearly. Every one
  // must resolve downwards. A false "live" is the failure that sends a
  // reseller to tell a client the job is done.
  const murky = [
    ["Vercel unreachable", { domainInfo: null, configInfo: null }],
    ["only the domain call answered", { domainInfo: verified, configInfo: null }],
    ["only the config call answered", { domainInfo: null, configInfo: ok }],
    ["misconfigured missing entirely", { domainInfo: verified, configInfo: {} }],
    ["misconfigured is a string", { domainInfo: verified, configInfo: { misconfigured: "false" } }],
    ["misconfigured is null", { domainInfo: verified, configInfo: { misconfigured: null } }],
    ["verified is explicitly false", { domainInfo: { verified: false }, configInfo: ok }],
  ];
  for (const [name, parts] of murky) {
    check(`${name} is not live`, () => {
      const s = domainStatus({ domain: "x.com", ...parts });
      assert.notStrictEqual(s.state, DOMAIN_STATES.LIVE);
    });
  }

  check("a missing verified field is trusted, since Vercel omits it when fine", () => {
    // Only `verified === false` blocks. Absent means "not disputed", and
    // misconfigured is still what decides live-ness.
    const s = domainStatus({ domain: "x.com", domainInfo: {}, configInfo: ok });
    assert.strictEqual(s.state, DOMAIN_STATES.LIVE);
  });
}

console.log("\nreading the nameservers");
{
  check("vercel's own are recognised", () =>
    assert.strictEqual(nameserversPointHere(["ns1.vercel-dns.com"]), true));
  check("a trailing dot and capitals don't fool it", () =>
    assert.strictEqual(nameserversPointHere(["NS1.Vercel-DNS.com."]), true));
  check("somebody else's are not", () =>
    assert.strictEqual(nameserversPointHere(["dns1.registrar-servers.com"]), false));
  check("unknown stays unknown rather than becoming false", () => {
    assert.strictEqual(nameserversPointHere([]), null);
    assert.strictEqual(nameserversPointHere(undefined), null);
  });
  check("a lookalike domain is not accepted", () =>
    assert.strictEqual(nameserversPointHere(["ns1.vercel-dns.com.evil.example"]), false));
}

console.log("\nwhat it tells the user");
{
  check("the wrong nameservers are named back to them", () => {
    const m = domainMessage(domainStatus({ domain: "x.com", domainInfo: verified, configInfo: notPointing }));
    assert.match(m, /dns1\.registrar-servers\.com/);
    assert.match(m, /nameservers/i);
  });

  check("a domain mid-flight is told to wait, not told it's wrong", () => {
    const m = domainMessage(domainStatus({ domain: "x.com", domainInfo: verified, configInfo: pointing }));
    assert.match(m, /pointing here/i);
    assert.ok(!/registrar/i.test(m), "still telling them to change something they already changed");
  });

  check("live says so plainly", () =>
    assert.match(
      domainMessage(domainStatus({ domain: "x.com", domainInfo: verified, configInfo: ok })),
      /^Live\./
    ));

  check("a failed check admits it rather than inventing a state", () => {
    const m = domainMessage(domainStatus({ domain: "x.com", domainInfo: null, configInfo: null }));
    assert.match(m, /Couldn't check/);
  });

  check("setup steps show only while there is something to do", () => {
    const live = domainStatus({ domain: "x.com", domainInfo: verified, configInfo: ok });
    const waiting = domainStatus({ domain: "x.com", domainInfo: verified, configInfo: notPointing });
    assert.strictEqual(showsSetup(live), false);
    assert.strictEqual(showsSetup(waiting), true);
    assert.strictEqual(showsSetup(null), false);
  });

  check("the nameservers offered are the ones the docs name", () =>
    assert.deepStrictEqual(VERCEL_NAMESERVERS, ["ns1.vercel-dns.com", "ns2.vercel-dns.com"]));
}

console.log("\nthe dashboard and the route agree");
{
  const { readFileSync } = await import("node:fs");
  const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
  const dashboard = read("../app/dashboard/dashboard-client.js");
  const route = read("../app/api/domain-status/route.js");

  check("the old always-connected wording is gone", () =>
    assert.ok(
      !/One more step — point the domain here/.test(dashboard),
      "the fixed instruction block is still rendered"
    ));
  check("the dashboard renders the real status", () =>
    assert.match(dashboard, /<DomainStatus/));
  check("the route checks project ownership before answering", () =>
    assert.match(route, /\.eq\("user_id", user\.id\)/));
  check("the route never writes", () =>
    assert.ok(!/\.(insert|update|delete)\(/.test(route), "domain-status mutates something"));
}

if (failures) {
  console.log(`\n${failures} check(s) failed`);
  process.exit(1);
}
console.log("\nall checks passed");
