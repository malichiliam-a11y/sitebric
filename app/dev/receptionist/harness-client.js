// Fixtures for the receptionist harness. See page.js for why this exists.
"use client";

import Receptionist from "../../dashboard/Receptionist";

const demo = { phoneNumber: "+15125550142", businessName: "Northgate Locksmiths" };

const line = (id, name, phone, forward, facts) => ({
  id,
  business_name: name,
  phone_number: phone,
  forward_to: forward,
  business_facts: facts,
  greeting: "",
  voice: "",
  is_demo: false,
  minutes_used: 12,
  minutes_limit: 120,
});

const noop = () => {};
const search = async () => [
  { phoneNumber: "+15125550188", locality: "Austin", region: "TX" },
  { phoneNumber: "+15125550190", locality: "Austin", region: "TX" },
];

const CASES = {
  trial: { canUse: false, allowance: 0, planLabel: "Free Trial", numbers: [] },
  empty: { canUse: true, allowance: 3, planLabel: "Starter", numbers: [] },
  two: {
    canUse: true,
    allowance: 3,
    planLabel: "Starter",
    numbers: [
      line("a", "Northgate Locksmiths", "+15125550142", "+15125551111", "Locks changed same day."),
      line("b", "Riverside Plumbing", "+15125550177", "+15125552222", "Emergency call-outs 24/7."),
    ],
  },
  full: {
    canUse: true,
    allowance: 3,
    planLabel: "Starter",
    numbers: [
      line("a", "Northgate Locksmiths", "+15125550142", "+15125551111", "Locks changed same day."),
      line("b", "Riverside Plumbing", "+15125550177", "+15125552222", "Emergency call-outs 24/7."),
      line("c", "Ace Roofing", "+15125550199", "+15125553333", "Free roof inspections."),
    ],
  },
};

export default function Harness({ state }) {
  const c = CASES[state] || CASES.trial;
  return (
    <div style={{ background: "#08080C", minHeight: "100vh", padding: 24 }}>
      <Receptionist
        numbers={c.numbers}
        calls={[]}
        demo={demo}
        isOwnerAccount={false}
        available
        canUse={c.canUse}
        allowance={c.allowance}
        planLabel={c.planLabel}
        onSearch={search}
        onBuy={noop}
        onSave={noop}
        onDelete={noop}
        onUpgrade={noop}
      />
    </div>
  );
}
