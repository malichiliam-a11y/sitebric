// The home page FAQ, in one place because two things now read it: the
// section that renders it and the FAQPage structured data on "/".
//
// Schema that claims questions the visitor cannot see is what gets rich
// results revoked, so these must stay the same list. Keeping them in one
// module is what makes that true by construction rather than by memory.
export const FAQS = [
  {
    q: "Do I own the sites I generate?",
    a: "Yes — every site you generate belongs to you to hand off or host for your client.",
  },
  {
    q: "Do clients need their own Sitebric account?",
    a: "No — your clients never see Sitebric. You manage everything from your dashboard and hand off the finished site.",
  },
  {
    q: "Can I use my own domain for client sites?",
    a: "Yes — Growth and Pro plans let you connect any domain you or your client owns.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, no contracts — cancel whenever, no questions asked.",
  },
] as const;
