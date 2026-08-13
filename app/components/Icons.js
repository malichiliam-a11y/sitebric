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

export const IconGift = (p) => (
  <Svg {...p}>
    <rect x="3" y="9" width="18" height="4" rx="1" />
    <path d="M5 13h14v7a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-7Z" />
    <path d="M12 9v12" />
    <path d="M12 9C9.5 9 8 7.5 8 6a2 2 0 0 1 4-.5A2 2 0 0 1 16 6c0 1.5-1.5 3-4 3Z" />
  </Svg>
);

export const IconShare = (p) => (
  <Svg {...p}>
    <circle cx="18" cy="5" r="2.4" />
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="18" cy="19" r="2.4" />
    <path d="m8.1 10.7 7.8-4.4M8.1 13.3l7.8 4.4" />
  </Svg>
);

export const IconInvoice = (p) => (
  <Svg {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" />
    <path d="M8.5 8h7M8.5 11.5h7M8.5 15h4" />
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

export const IconSun = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.2 5.2l1.4 1.4M17.4 17.4l1.4 1.4M18.8 5.2l-1.4 1.4M6.6 17.4l-1.4 1.4" />
  </Svg>
);

export const IconStar = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="m12 2.6 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9L12 2.6Z" />
  </svg>
);

// Brand glyphs for the footer. Solid-fill marks, not the outline set.
export const IconX = ({ size = 17 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.5 3h3.1l-6.8 7.7L21.8 21h-6.2l-4.9-6.4L5.1 21H2l7.2-8.3L2.5 3h6.4l4.4 5.8L17.5 3Zm-1.1 16.1h1.7L7.7 4.8H5.9l10.5 14.3Z" />
  </svg>
);

export const IconDiscord = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.3 5.6A16.1 16.1 0 0 0 15.4 4.4l-.2.4c1.3.3 2.4.8 3.4 1.5-1.7-.9-3.4-1.4-5.6-1.4s-3.9.5-5.6 1.4c1-.6 2.2-1.2 3.4-1.5l-.2-.4c-1.5.3-2.9.7-4 1.2C3.2 9 2.4 13.1 2.7 17.3A16.3 16.3 0 0 0 7.6 19.8l1-1.7c-.8-.3-1.6-.7-2.3-1.2l.5-.4c2.1 1 4.3 1.5 6.4 1.5s4.3-.5 6.4-1.5l.5.4c-.7.5-1.5.9-2.3 1.2l1 1.7a16.3 16.3 0 0 0 4.9-2.5c.4-4.9-.8-8.9-3.4-11.7ZM9.2 14.9c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm5.6 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
  </svg>
);

export const IconGitHub = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.4-3.4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.4 1.1 3 .8.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7 1 .7 2v2.9c0 .3.2.6.7.5A10 10 0 0 0 12 2Z" />
  </svg>
);
