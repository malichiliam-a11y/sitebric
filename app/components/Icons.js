// Thin outline icon set matching the reference design. All icons inherit
// currentColor and a 1.6 stroke so they sit consistently next to text.
const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function Svg({ size = 18, children }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" {...base} aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconHome = (p) => (
  <Svg {...p}>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20h13V9.5" />
  </Svg>
);

export const IconSites = (p) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <path d="M3 9h18" />
    <circle cx="6.2" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
  </Svg>
);

export const IconLeads = (p) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <circle cx="9" cy="11" r="2" />
    <path d="M5.8 16.2c.6-1.6 1.9-2.4 3.2-2.4s2.6.8 3.2 2.4" />
    <path d="M15 10h3.5M15 13.5h3.5" />
  </Svg>
);

export const IconBilling = (p) => (
  <Svg {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3 10h18" />
  </Svg>
);

export const IconSettings = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5v.2a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
  </Svg>
);

export const IconUser = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.4" />
    <path d="M5 20c.9-3.4 3.7-5 7-5s6.1 1.6 7 5" />
  </Svg>
);

export const IconSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Svg>
);

export const IconBell = (p) => (
  <Svg {...p}>
    <path d="M18 8.6a6 6 0 1 0-12 0c0 5.4-2 6.9-2 6.9h16s-2-1.5-2-6.9Z" />
    <path d="M13.7 19a2 2 0 0 1-3.4 0" />
  </Svg>
);

export const IconMail = (p) => (
  <Svg {...p}>
    <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
    <path d="m3.5 6.5 8.5 6 8.5-6" />
  </Svg>
);

export const IconEye = (p) => (
  <Svg {...p}>
    <path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
);

export const IconEyeOff = (p) => (
  <Svg {...p}>
    <path d="M17.9 17.9A10.4 10.4 0 0 1 12 19.5C5.8 19.5 2 12 2 12a18.7 18.7 0 0 1 5.1-5.9m2.8-1.3A10.4 10.4 0 0 1 12 4.5c6.2 0 10 7.5 10 7.5a18.6 18.6 0 0 1-2.2 3.2m-6.6-1a2.8 2.8 0 1 1-4-4" />
    <path d="m2 2 20 20" />
  </Svg>
);

export const IconPlus = (p) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconArrowRight = (p) => (
  <Svg {...p}>
    <path d="M4 12h15" />
    <path d="m13 6 6 6-6 6" />
  </Svg>
);

export const IconChevronRight = (p) => (
  <Svg {...p}>
    <path d="m9 5 7 7-7 7" />
  </Svg>
);

export const IconChevronDown = (p) => (
  <Svg {...p}>
    <path d="m5 9 7 7 7-7" />
  </Svg>
);

export const IconSparkle = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.5l-1.8-5.9L4.5 10.8 10.2 9 12 3.5Z" />
  </Svg>
);

export const IconRocket = (p) => (
  <Svg {...p}>
    <path d="M13.5 4.5c3.4-1.7 6-1.2 6-1.2s.5 2.6-1.2 6c-1.4 2.8-4 5-6.6 6.3L8.4 12.6c1.3-2.6 3.4-5.2 6.2-6.6" />
    <path d="M8.4 12.6 6 15l3 3 2.4-2.4" />
    <circle cx="15.2" cy="8.8" r="1.4" />
  </Svg>
);

export const IconPencil = (p) => (
  <Svg {...p}>
    <path d="M16.5 3.9a2.1 2.1 0 0 1 3 3L8.4 18l-4 1 1-4 11.1-11.1Z" />
  </Svg>
);

export const IconBolt = (p) => (
  <Svg {...p}>
    <path d="M13.5 3 6 13.5h5L10.5 21 18 10.5h-5L13.5 3Z" />
  </Svg>
);
