"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase-browser";
import { PLAN_LIMITS, MULTIPAGE_COST, MULTIPAGE_ENABLED, canUseCustomDomain } from "@/lib/plans";
import GeneratingProgress from "./GeneratingProgress";
import { withPreviewAnchorFix } from "@/lib/preview-anchors";
import { currentLogoUrl } from "@/lib/logo";
import { leadsToCsv, csvFilename } from "@/lib/leads-csv";
import LeadDetail from "./LeadDetail";
import StylePicker from "./StylePicker";
import Receptionist from "./Receptionist";
import { DEFAULT_STYLE, styleById } from "@/lib/site-styles";
import { canUseReceptionist } from "@/lib/plans";
import { LeadResultCard, SavedLeadRow } from "./LeadCards";

// Read straight out of the site's own HTML rather than tracked in its own
// column, so the button can never disagree with what the site actually
// shows.
function logoUrlOf(project) {
  return project?.code ? currentLogoUrl(project.code) : null;
}

// A generation that exceeds the platform's function time limit is killed
// outright — the route's own error handler never runs, so the row keeps
// saying "generating" forever, the card spins for the rest of time, and
// the status poll hits the database every 2 seconds with it. Past the
// point where the function cannot still be alive, treat it as failed.
// Must stay above /api/generate's maxDuration.
const STALE_GENERATING_MS = 6 * 60 * 1000;
import { readReferralCode, clearReferralCode } from "@/lib/referral";
import { readUtmParams, clearUtmParams } from "@/lib/utm";
import { COUNTRY_CODES, countryLabel, guessCountryFromBrowser } from "@/lib/countries";
import { t, cardBg } from "@/lib/theme";
import { Wordmark } from "@/app/components/Brand";
import DashAmbient from "@/app/components/dashboard/DashAmbient";
import { FilmGrain } from "@/app/components/login/primitives";
import {
  IconHome, IconSites, IconLeads, IconBilling, IconSettings, IconUser,
  IconSearch, IconBell, IconPlus, IconArrowRight, IconChevronRight, IconSparkle,
  IconRocket as IconRocketish, IconInvoice, IconShare,
} from "@/app/components/Icons";

export default function DashboardClient({ initialProjects }) {
  const supabase = createClient();

  // Someone with no sites yet opens on the builder, not on the overview.
  // The overview is a page of empty stat cards reading "Nothing yet" —
  // a fair summary for a returning user and a dead end for a new one,
  // who then has to work out that the thing they signed up to do lives
  // behind another tab. 21 of the first 38 trial accounts never generated
  // anything at all, and this is the first screen all of them saw.
  //
  // Decided from the server-rendered prop rather than in an effect, so
  // there is no flash of the wrong tab and nothing to hydrate differently.
  const [tab, setTab] = useState(initialProjects.length === 0 ? "sites" : "overview");
  const [projects, setProjects] = useState(initialProjects);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState("preview");
  const [clientName, setClientName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [photoUrls, setPhotoUrls] = useState([]);
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [calendlyUrl, setCalendlyUrl] = useState("");
  const [orderLinks, setOrderLinks] = useState("");
  const [multiPage, setMultiPage] = useState(false);
  const [style, setStyle] = useState(DEFAULT_STYLE);
  // Snapshotted when a generation starts, so the countdown keeps showing
  // the right estimate even though multiPage itself gets reset on success.
  const [genStart, setGenStart] = useState(null);
  const [genStage, setGenStage] = useState(null);
  const [rebuilding, setRebuilding] = useState(false);
  const [previewFull, setPreviewFull] = useState(false);

  // Someone who clicked a plan before signing in gets sent to sign up,
  // and the plan they picked is waiting here. Resuming it automatically
  // is the difference between a completed purchase and someone landing in
  // an unfamiliar dashboard wondering what happened to the thing they
  // were buying.
  useEffect(() => {
    let plan = null;
    let interval = null;
    try {
      plan = window.localStorage.getItem("sb_pending_plan");
      // Read alongside the plan: someone who picked the yearly price
      // while logged out must not land in a monthly checkout.
      interval = window.localStorage.getItem("sb_pending_interval");
      if (plan) window.localStorage.removeItem("sb_pending_plan");
      window.localStorage.removeItem("sb_pending_interval");
    } catch {
      // Storage unavailable — nothing to resume.
    }
    if (!plan) return;

    (async () => {
      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan, interval: interval || "month" }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
      } catch {
        // Checkout can be reached again from Billing; failing here must
        // not stop the dashboard loading.
      }
    })();
  }, []);

  // Without this the page behind keeps scrolling under the overlay on a
  // phone, which reads as the site sliding around while you drag it.
  useEffect(() => {
    if (!previewFull) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [previewFull]);
  const [showContactFields, setShowContactFields] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const active = projects.find((p) => p.id === activeId);
  const accent = "#FFFFFF";
  // Set in app/layout.js. A serif for headings, a sans for reading —
  // everything here used to be Inter, which is what every generated SaaS
  // page on the internet is set in.
  const display = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";
  const body = "var(--font-body), -apple-system, BlinkMacSystemFont, sans-serif";
  const [billingStatus, setBillingStatus] = useState(null);
  const [referralStats, setReferralStats] = useState(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const [inquiries, setInquiries] = useState([]);
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  const previewFrameRef = useRef(null);
  const newSiteFormRef = useRef(null);

  const [invoices, setInvoices] = useState([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);
  const [invoiceClientName, setInvoiceClientName] = useState("");
  const [invoiceClientEmail, setInvoiceClientEmail] = useState("");
  const [invoiceAmount, setInvoiceAmount] = useState("");
  const [invoiceDescription, setInvoiceDescription] = useState("");
  const [invoiceProjectId, setInvoiceProjectId] = useState("");
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceSuccess, setInvoiceSuccess] = useState("");

  async function loadInvoices() {
    setInvoicesLoading(true);
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });
    setInvoices(data || []);
    setInvoicesLoading(false);
  }

  useEffect(() => {
    if (tab !== "invoices") return;
    loadInvoices();
  }, [tab, supabase]);

  const [shareCopied, setShareCopied] = useState(false);
  // sms: links silently do nothing on a desktop browser with no Messages
  // app to hand off to, so the second share button switches to a Gmail
  // compose link there instead. Checked after mount (not during render)
  // so server and first client render match and there's no hydration
  // mismatch warning.
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  useEffect(() => {
    setIsMobileDevice(/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
  }, []);

  async function sendInvoice() {
    setInvoiceError("");
    setInvoiceSuccess("");
    if (!invoiceClientName.trim() || !invoiceClientEmail.trim() || !invoiceAmount) {
      setInvoiceError("Client name, email, and amount are required.");
      return;
    }
    setInvoiceBusy(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: invoiceClientName.trim(),
          clientEmail: invoiceClientEmail.trim(),
          amount: Number(invoiceAmount),
          description: invoiceDescription.trim(),
          projectId: invoiceProjectId || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        throw new Error(data.error || "Couldn't send the invoice.");
      }
      setInvoices((prev) => [data.invoice, ...prev]);
      setInvoiceClientName("");
      setInvoiceClientEmail("");
      setInvoiceAmount("");
      setInvoiceDescription("");
      setInvoiceProjectId("");
      setInvoiceSuccess(
        data.emailError
          ? `Invoice saved, but the email didn't send (${data.emailError}). You can still share it manually.`
          : "Invoice sent."
      );
    } catch (err) {
      setInvoiceError(err.message);
    } finally {
      setInvoiceBusy(false);
    }
  }

  // "New client site" switches to the sites tab and deselects the active
  // project, which mounts the generation form — but on mobile the sidebar
  // (with the button that was just clicked) stacks above it, so the form
  // renders off-screen below the fold with no visual cue it appeared at
  // all. The timeout lets that mount happen before scrolling to it.
  function goToNewSiteForm() {
    setTab("sites");
    setActiveId(null);
    setTimeout(() => {
      newSiteFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  // A visitor who tries the public /demo generator before signing up has
  // it stash what they typed in localStorage; picking it up here on first
  // load means they land straight on a pre-filled real generation instead
  // of retyping the business they already described.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("sb_demo_seed");
      if (!raw) return;
      window.localStorage.removeItem("sb_demo_seed");
      const seed = JSON.parse(raw);
      if (seed?.clientName) setClientName(seed.clientName);
      if (seed?.prompt) setPrompt(seed.prompt);
      if (seed?.clientName || seed?.prompt) goToNewSiteForm();
    } catch {
      // Malformed or inaccessible storage — just skip the prefill.
    }
  }, []);

  // tel:/mailto: links inside the sandboxed preview iframe can't reliably
  // navigate on their own — the sandbox tokens that should allow it
  // (allow-top-navigation-to-custom-protocols) work in Chromium but are
  // inconsistently honored in Safari, so "Call Now" silently did nothing
  // there. The generated page's Call Now link now also posts a message up
  // to this un-sandboxed parent, which performs the actual tel:/mailto:
  // navigation itself — that's never subject to the iframe's sandbox at
  // all, in any browser. Verify the message really came from our own
  // preview iframe (sandboxed srcDoc iframes report event.origin as the
  // literal string "null") before acting on it.
  useEffect(() => {
    function onMessage(event) {
      if (event.origin !== "null") return;
      if (event.source !== previewFrameRef.current?.contentWindow) return;
      const href = event.data?.type === "sitebric-tel" ? event.data.href : null;
      if (typeof href === "string" && /^(tel|mailto):/i.test(href)) {
        window.location.href = href;
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // Loaded on demand rather than alongside every project — most sites
  // Set after mount rather than in the initial state: the server has no
  // navigator to read, so seeding it during render would hydrate to a
  // different value than it rendered with.
  useEffect(() => {
    const guessed = guessCountryFromBrowser();
    if (guessed) setLeadCountry(guessed);
  }, []);

  // never get opened to this tab in a given session.
  useEffect(() => {
    if (view !== "inquiries" || !activeId) return;
    setInquiriesLoading(true);
    supabase
      .from("site_inquiries")
      .select("*")
      .eq("project_id", activeId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setInquiries(data || []);
        setInquiriesLoading(false);
      });
  }, [view, activeId, supabase]);

  // Account deletion is irreversible and cancels billing, so it is gated
  // behind typing the word rather than a single click.
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDeleteAccount() {
    setDeleteError("");
    setDeleteBusy(true);
    try {
      const res = await fetch("/api/delete-account", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.error) {
        setDeleteError(data.error || "Couldn't delete your account. Email support and we'll do it for you.");
        setDeleteBusy(false);
        return;
      }
      // The auth user is gone server-side; clear the local session too so
      // the app does not try to reuse a token for a deleted account.
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (err) {
      setDeleteError(err.message || "Something went wrong. Please try again.");
      setDeleteBusy(false);
    }
  }

  async function loadBillingStatus() {
    const res = await fetch("/api/billing-status");
    const data = await res.json();
    setBillingStatus(data);
  }

  async function loadReferralStats() {
    const res = await fetch("/api/referral-stats");
    const data = await res.json().catch(() => null);
    if (data) setReferralStats(data);
  }

  useEffect(() => {
    loadProfile();
    loadBillingStatus();
    loadReferralStats();
  }, [supabase]);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
    if (user) {
      let { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!data) {
        // Brand new user with no profile row yet — create their free
        // trial row now so Billing shows it correctly right away, and
        // pass along whatever referral code and UTM params were
        // captured on landing.
        await fetch("/api/ensure-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: readReferralCode(), ...readUtmParams() }),
        });
        clearReferralCode();
        clearUtmParams();
        const retry = await supabase.from("profiles").select("*").eq("id", user.id).single();
        data = retry.data;
      }
      setProfile(data);
    }
  }

  useEffect(() => {
    // Only poll for rows that could still plausibly be running. A row left
    // stuck at "generating" by a killed function would otherwise keep this
    // interval hitting the database every 2 seconds forever.
    const hasGenerating = projects.some(
      (p) =>
        p.status === "generating" &&
        Date.now() - new Date(p.created_at).getTime() <= STALE_GENERATING_MS
    );
    if (!hasGenerating || !user) return;
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
    }, 2000);
    return () => clearInterval(interval);
  }, [projects, supabase, user]);

  async function generate() {
    if (!clientName.trim() || !prompt.trim()) return;
    setBusy(true);
    setError("");
    setGenStart({ at: Date.now(), multiPage });
    setGenStage(multiPage ? "shell" : null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientName, prompt, photoUrls, phone, address, ownerEmail, calendlyUrl, orderLinks, multiPage, style }),
      });

      // Not every response is JSON. When the function exceeds its time
      // limit the platform replies with a plain-text error page, and
      // res.json() on that threw "Unexpected token 'A', "An error o"... is
      // not valid JSON" straight into the error box — a parse error where
      // an explanation should be. Read the body once, then decide.
      const rawBody = await res.text();
      let result;
      try {
        result = JSON.parse(rawBody);
      } catch {
        result = {
          error: "unreadable_response",
          message:
            res.status === 504 || /timed out|timeout/i.test(rawBody)
              ? "This site took longer than the time limit allows. This didn't use up one of your generations — try a shorter brief, or generate it as a single-page site."
              : "The server sent back something unreadable. This didn't use up one of your generations — please try again.",
        };
      }

      if (res.status === 402) {
        if (result.error === "site_limit") {
          setError(result.message + " Delete an existing site to free up a slot, or upgrade your plan.");
          return;
        }
        // Still has generations left, just not the 3 a multi-page build
        // costs — that's a fixable mistake, not a reason to be thrown at
        // the pricing page.
        if (result.error === "generation_limit" && result.remaining > 0) {
          setError(result.message);
          return;
        }
        window.location.href = "/pricing";
        return;
      }

      if (!res.ok) throw new Error(result.message || result.error || "failed");

      // A multi-page build comes back with only the shell done. Each page
      // is then its own request, so none of them share a time limit, and
      // they run at the same time.
      if (result.status === "building") {
        setGenStage("pages");
        const outcomes = await Promise.all(
          result.pages.map(async (page) => {
            const r = await fetch("/api/generate-page", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId: result.id, page }),
            });
            const body = await r.text();
            let parsed;
            try { parsed = JSON.parse(body); } catch { parsed = {}; }
            return { page, ok: r.ok, message: parsed.error };
          })
        );

        // One failed page is retried once, by itself. The pages that
        // succeeded are already saved and are not regenerated.
        const failed = outcomes.filter((o) => !o.ok);
        for (const f of failed) {
          const r = await fetch("/api/generate-page", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectId: result.id, page: f.page }),
          });
          if (!r.ok) {
            const body = await r.text();
            let parsed;
            try { parsed = JSON.parse(body); } catch { parsed = {}; }
            throw new Error(parsed.error || `The ${f.page} page couldn't be built.`);
          }
        }

        setGenStage("finishing");
        const fin = await fetch("/api/generate-finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId: result.id }),
        });
        const finBody = await fin.text();
        let finResult;
        try { finResult = JSON.parse(finBody); } catch { finResult = {}; }
        if (!fin.ok) throw new Error(finResult.error || "Couldn't finish the site.");
      }

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
      setActiveId(result.id);
      setClientName("");
      setPrompt("");
      setPhotoUrls([]);
      setPhone("");
      setAddress("");
      setOwnerEmail("");
      setCalendlyUrl("");
      setOrderLinks("");
      setMultiPage(false);
      setShowContactFields(false);
      loadProfile();
    } catch (err) {
      // A dropped connection ("Load failed" / "Failed to fetch") is not the
      // same as a failed generation: the project row was created before the
      // model was ever called, and the server keeps working after the
      // browser gives up. Refreshing the list surfaces that row so the
      // poller can finish it — otherwise the user retries, creating a
      // duplicate site and spending a second generation.
      const droppedConnection =
        err instanceof TypeError || /load failed|failed to fetch|network/i.test(err.message || "");

      if (droppedConnection) {
        const { data } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (data) setProjects(data);
        setError(
          "The connection dropped while your site was generating, but it is still building — watch for it in Sites. Do not resubmit or you will be charged for two."
        );
      } else {
        setError(err.message);
      }
    } finally {
      setBusy(false);
      setGenStart(null);
      setGenStage(null);
    }
  }

  const [domainInput, setDomainInput] = useState("");
  const [domainBusy, setDomainBusy] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [editInstruction, setEditInstruction] = useState("");
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [clientLinkBusy, setClientLinkBusy] = useState(false);
  const [clientLinkUrl, setClientLinkUrl] = useState("");
  const [clientLinkCopied, setClientLinkCopied] = useState(false);
  const [clientLinkError, setClientLinkError] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState("");
  const [publishError, setPublishError] = useState("");
  const [leadLocation, setLeadLocation] = useState("");
  const [leadCategory, setLeadCategory] = useState("");
  // Empty means "let the server decide from the request's country header",
  // which is right far more often than defaulting everyone to the US.
  const [leadCountry, setLeadCountry] = useState("");
  const [leadResults, setLeadResults] = useState(null);
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadError, setLeadError] = useState("");
  // Which search produced the results on screen. Held separately from the
  // input boxes so that editing "locksmiths" to "plumbers" without
  // pressing Search doesn't quietly rewrite the script for leads that
  // came from the previous search.
  const [leadSearchedFor, setLeadSearchedFor] = useState({ category: "", location: "" });
  const [leadView, setLeadView] = useState("search");
  const [openLead, setOpenLead] = useState(null);
  // null until the list has been fetched, so an empty list and a list
  // that hasn't loaded yet don't both render "you haven't saved anyone".
  const [savedLeads, setSavedLeads] = useState(null);
  const [savedBusy, setSavedBusy] = useState(false);
  const [savedError, setSavedError] = useState("");
  const [rxNumbers, setRxNumbers] = useState(null);
  const [rxCalls, setRxCalls] = useState([]);
  const [rxAvailable, setRxAvailable] = useState(true);
  const [rxCanUse, setRxCanUse] = useState(null);
  const [rxBusy, setRxBusy] = useState(false);
  const [rxError, setRxError] = useState("");
  const [siteSearch, setSiteSearch] = useState("");
  const [settingsPhone, setSettingsPhone] = useState("");
  const [settingsAddress, setSettingsAddress] = useState("");
  const [settingsOwnerEmail, setSettingsOwnerEmail] = useState("");
  const [settingsCalendlyUrl, setSettingsCalendlyUrl] = useState("");
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  // Populate the settings form from whichever project is open — a plain
  // assignment here (not inside saveSettings) so switching between sites
  // never leaves one site's edited-but-unsaved values showing on another.
  useEffect(() => {
    if (!active) return;
    setSettingsPhone(active.phone || "");
    setSettingsAddress(active.address || "");
    setSettingsOwnerEmail(active.owner_email || "");
    setSettingsCalendlyUrl(active.calendly_url || "");
    setSettingsError("");
    setSettingsSaved(false);
    // Same reason: a link belongs to one site, and showing the previous
    // site's link here would get the wrong URL sent to a client.
    setClientLinkUrl("");
    setClientLinkCopied(false);
    setClientLinkError("");
    setLogoError("");
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function saveSettings() {
    if (!active) return;
    setSettingsBusy(true);
    setSettingsError("");
    setSettingsSaved(false);
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({
          phone: settingsPhone.trim() || null,
          address: settingsAddress.trim() || null,
          owner_email: settingsOwnerEmail.trim() || null,
          calendly_url: settingsCalendlyUrl.trim() || null,
        })
        .eq("id", active.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      if (data) setProjects((prev) => prev.map((p) => (p.id === data.id ? data : p)));

      // Phone/address/booking link are baked into the generated HTML at
      // generation time — saving the database row alone wouldn't change
      // what the live site actually shows, so also push those specific
      // changes into the page itself. The owner email only controls where
      // lead notifications are sent, so it never needs a page edit.
      const contactChanged =
        settingsPhone.trim() !== (active.phone || "") ||
        settingsAddress.trim() !== (active.address || "") ||
        settingsCalendlyUrl.trim() !== (active.calendly_url || "");
      if (contactChanged) {
        const parts = [];
        parts.push(
          settingsPhone.trim()
            ? `the phone number / Call Now links to "${settingsPhone.trim()}"`
            : "remove the phone number and make Call Now links scroll to the contact section instead"
        );
        if (settingsAddress.trim() !== (active.address || "")) {
          parts.push(
            settingsAddress.trim()
              ? `the business address and map to "${settingsAddress.trim()}"`
              : "remove the address and map section"
          );
        }
        if (settingsCalendlyUrl.trim() !== (active.calendly_url || "")) {
          parts.push(
            settingsCalendlyUrl.trim()
              ? `the booking link to "${settingsCalendlyUrl.trim()}"`
              : "remove the booking link and point that CTA at the contact form instead"
          );
        }
        const res = await fetch("/api/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: active.id,
            instruction: `Update ${parts.join(", and ")}. Keep everything else on the page exactly the same.`,
          }),
        });
        const result = await res.json();
        if (res.status === 402) {
          window.location.href = "/pricing";
          return;
        }
        if (!res.ok) throw new Error(result.message || result.error || "Saved the details, but couldn't update the live page to match");
        const { data: refreshed } = await supabase
          .from("projects")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });
        if (refreshed) setProjects(refreshed);
        loadProfile();
      }
      setSettingsSaved(true);
    } catch (err) {
      setSettingsError(err.message);
    } finally {
      setSettingsBusy(false);
    }
  }

  async function findLeads() {
    if (!leadLocation.trim() || !leadCategory.trim()) return;
    setLeadBusy(true);
    setLeadError("");
    setLeadResults(null);
    try {
      const res = await fetch("/api/find-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: leadLocation,
          category: leadCategory,
          country: leadCountry || undefined,
          // Names and addresses come back in this language instead of
          // always English.
          language: typeof navigator !== "undefined" ? navigator.language : undefined,
        }),
      });
      const result = await res.json();

      if (res.status === 402) {
        setLeadError(result.message);
        return;
      }

      if (!res.ok) throw new Error(result.message || result.error || "failed");

      setLeadResults(result.leads);
      setLeadSearchedFor({ category: leadCategory.trim(), location: leadLocation.trim() });
      setLeadView("search");
      loadProfile();
    } catch (err) {
      setLeadError(err.message);
    } finally {
      setLeadBusy(false);
    }
  }

  function generateForLead(lead) {
    setTab("sites");
    setActiveId(null);
    setClientName(lead.name);
    setPhotoUrls([]);
    setPrompt(
      `${lead.name} is a local business${lead.address ? ` located at ${lead.address}` : ""}${
        lead.phone ? `, phone ${lead.phone}` : ""
      }. Build them a professional website that fits their industry.`
    );
    // Google Places already gave us real phone/address — put them in the
    // actual contact fields, not just prose in the prompt, so Call Now
    // and the Maps section use this real data instead of falling back to
    // "no contact info was given."
    setPhone(lead.phone || "");
    setAddress(lead.address || "");
    setOwnerEmail("");
    setCalendlyUrl("");
    setShowContactFields(Boolean(lead.phone || lead.address));
    setOpenLead(null);
  }

  // ===== The call list =====
  //
  // A lead search costs against the monthly allowance and the results used
  // to live in React state alone: a refresh, or a click on any other tab,
  // threw away a paid search. Saving is what makes a search worth
  // spending.

  async function loadSavedLeads() {
    setSavedBusy(true);
    setSavedError("");
    try {
      const res = await fetch("/api/saved-leads");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "failed");
      setSavedLeads(result.leads || []);
    } catch (err) {
      setSavedError(err.message);
      // An empty array rather than null: the list renders its empty state
      // instead of spinning forever next to the error.
      setSavedLeads((current) => current || []);
    } finally {
      setSavedBusy(false);
    }
  }

  // Fetched the first time the tab is opened rather than on page load —
  // most sessions never touch Find Leads, and the dashboard already makes
  // enough requests on mount.
  useEffect(() => {
    if (tab === "leads" && savedLeads === null && !savedBusy) loadSavedLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function isSaved(placeId) {
    return Boolean(savedLeads?.some((l) => l.place_id === placeId));
  }

  async function saveLead(lead, context) {
    // Optimistic: the button is the kind people press while a phone is
    // ringing, and a spinner there reads as "it didn't work".
    const optimistic = {
      place_id: lead.id,
      name: lead.name,
      address: lead.address || "",
      phone: lead.phone || "",
      phone_dial: lead.phoneDial || lead.phone || "",
      maps_url: lead.mapsUrl || "",
      website: lead.website || null,
      has_website: Boolean(lead.hasWebsite),
      category: context?.category || "",
      location: context?.location || "",
      created_at: new Date().toISOString(),
    };
    setSavedLeads((current) => [optimistic, ...(current || []).filter((l) => l.place_id !== lead.id)]);
    setSavedError("");

    try {
      const res = await fetch("/api/saved-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead, category: context?.category, location: context?.location }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "failed");
      setSavedLeads((current) =>
        (current || []).map((l) => (l.place_id === lead.id ? result.lead : l))
      );
    } catch (err) {
      // Put it back the way it was, so the list on screen is never a list
      // the server doesn't have.
      setSavedLeads((current) => (current || []).filter((l) => l.place_id !== lead.id));
      setSavedError(`Couldn't save ${lead.name} — ${err.message}`);
    }
  }

  async function unsaveLead(placeId) {
    const previous = savedLeads || [];
    setSavedLeads(previous.filter((l) => l.place_id !== placeId));
    setSavedError("");
    try {
      const res = await fetch(`/api/saved-leads?placeId=${encodeURIComponent(placeId)}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.error || "failed");
      }
    } catch (err) {
      setSavedLeads(previous);
      setSavedError(`Couldn't remove that lead — ${err.message}`);
    }
  }

  function downloadSavedLeads() {
    const rows = savedLeads || [];
    if (rows.length === 0) return;
    // Built in the browser from what's already on screen — no round trip,
    // and it works the moment the list is loaded.
    const blob = new Blob([leadsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoked on the next tick — revoking synchronously cancels the
    // download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ===== The receptionist =====

  async function loadReceptionist() {
    setRxBusy(true);
    try {
      const res = await fetch("/api/receptionist");
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "failed");
      setRxNumbers(result.numbers || []);
      setRxCalls(result.calls || []);
      setRxAvailable(result.available !== false);
      setRxCanUse(result.canUse !== false);
    } catch (err) {
      setRxError(err.message);
      setRxNumbers((current) => current || []);
    } finally {
      setRxBusy(false);
    }
  }

  useEffect(() => {
    if (tab === "receptionist" && rxNumbers === null && !rxBusy) loadReceptionist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function searchNumbers(areaCode) {
    setRxBusy(true);
    setRxError("");
    try {
      const res = await fetch(`/api/receptionist?search=1&areaCode=${encodeURIComponent(areaCode || "")}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || result.error || "failed");
      if (result.notConfigured) setRxAvailable(false);
      return result.numbers || [];
    } catch (err) {
      setRxError(err.message);
      return [];
    } finally {
      setRxBusy(false);
    }
  }

  async function buyReceptionistNumber(payload) {
    setRxBusy(true);
    setRxError("");
    try {
      const res = await fetch("/api/receptionist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || result.error || "failed");
      setRxNumbers([result.number]);
    } catch (err) {
      setRxError(err.message);
    } finally {
      setRxBusy(false);
    }
  }

  async function saveReceptionist(patch) {
    setRxBusy(true);
    setRxError("");
    try {
      const res = await fetch("/api/receptionist", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || result.error || "failed");
      setRxNumbers((current) => (current || []).map((n) => (n.id === result.number.id ? result.number : n)));
    } catch (err) {
      setRxError(err.message);
    } finally {
      setRxBusy(false);
    }
  }

  async function deleteReceptionistNumber(id) {
    setRxBusy(true);
    setRxError("");
    try {
      const res = await fetch(`/api/receptionist?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const result = await res.json().catch(() => ({}));
        throw new Error(result.message || result.error || "failed");
      }
      setRxNumbers([]);
    } catch (err) {
      setRxError(err.message);
    } finally {
      setRxBusy(false);
    }
  }

  // Whether a site already exists for this business, and where it lives.
  // Matched on name because that is the only thing a project and a Google
  // listing share — generateForLead fills client_name straight from the
  // lead, so the match holds for anything built through that button.
  //
  // It changes the script from "I could build you one" to "I already
  // built it", which is the whole reason this product beats a cold call
  // about a website that doesn't exist yet.
  function siteForLead(lead) {
    const wanted = String(lead?.name || "").trim().toLowerCase();
    if (!wanted) return { built: false, link: "" };
    const match = projects.find(
      (p) => p.status === "done" && String(p.client_name || "").trim().toLowerCase() === wanted
    );
    if (!match) return { built: false, link: "" };
    // Only a link that a stranger can actually open. An unpublished site
    // has no public URL, and putting a dashboard URL in a text message
    // to a business owner would send them to a login screen.
    const link = match.published
      ? match.slug
        ? `https://${match.slug}.sitebric.com`
        : `https://sitebric.com/s/${match.id}`
      : "";
    return { built: true, link };
  }

  // A saved row and a fresh search result are the same business in two
  // different shapes. The detail panel takes one shape.
  function normalizeSaved(row) {
    return {
      id: row.place_id,
      name: row.name,
      address: row.address,
      phone: row.phone,
      phoneDial: row.phone_dial || row.phone,
      mapsUrl: row.maps_url,
      website: row.website,
      hasWebsite: row.has_website,
    };
  }

  async function handlePhotoUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setPhotoUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        const path = `${user?.id || "anon"}/${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("client-photos")
          .upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("client-photos").getPublicUrl(path);
        uploaded.push(data.publicUrl);
      }
      setPhotoUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError("Photo upload failed: " + err.message);
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  }

  function removePhoto(url) {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  }

  // Putting a logo on a finished site is a plain HTML swap on the server —
  // no AI call — so it is instant and costs no generations. That is the
  // whole point: "change the logo" was costing the same as a new website.
  // A private link to show a client, without putting the site on the
  // public internet. Publishing was being used for this and then undone
  // afterwards — seven sites were published and taken back down.
  async function makeShareLink(project) {
    if (!project) return;
    setClientLinkBusy(true);
    setClientLinkError("");
    try {
      const res = await fetch("/api/share-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't make a link.");
      setClientLinkUrl(data.url);

      // Clipboard access is refused in some in-app browsers, so a failure
      // here leaves the link on screen to copy by hand rather than
      // looking like the button did nothing.
      try {
        await navigator.clipboard.writeText(data.url);
        setClientLinkCopied(true);
        setTimeout(() => setClientLinkCopied(false), 2500);
      } catch {
        setClientLinkCopied(false);
      }
    } catch (err) {
      setClientLinkError(err.message);
    } finally {
      setClientLinkBusy(false);
    }
  }

  async function setLogo(project, logoUrl) {
    setLogoBusy(true);
    setLogoError("");
    try {
      const res = await fetch("/api/set-logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, logoUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Couldn't update the logo.");

      const { data: rows } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (rows) setProjects(rows);
    } catch (err) {
      setLogoError(err.message);
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleLogoFile(e, project) {
    const file = (e.target.files || [])[0];
    e.target.value = "";
    if (!file || !project) return;

    // Checked here as well as on the server so the reseller gets an
    // instant answer instead of waiting on an upload that cannot work.
    if (!/^image\//.test(file.type)) {
      setLogoError("That file isn't an image. Use a PNG, JPG or SVG.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setLogoError("That logo is over 2MB — a smaller file will load faster for visitors.");
      return;
    }

    setLogoBusy(true);
    setLogoError("");
    try {
      const path = `${user?.id || "anon"}/logo-${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("client-photos")
        .upload(path, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("client-photos").getPublicUrl(path);
      await setLogo(project, data.publicUrl);
    } catch (err) {
      setLogoError("Logo upload failed: " + err.message);
      setLogoBusy(false);
    }
  }

  async function editSite() {
    if (!editInstruction.trim() || !active) return;
    setEditBusy(true);
    setEditError("");
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: active.id, instruction: editInstruction }),
      });
      const result = await res.json();

      if (res.status === 402) {
        window.location.href = "/pricing";
        return;
      }

      if (!res.ok) throw new Error(result.message || result.error || "failed");

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
      setEditInstruction("");
      loadProfile();
    } catch (err) {
      setEditError(err.message);
    } finally {
      setEditBusy(false);
    }
  }


  async function connectDomain(project) {
    if (!domainInput.trim()) return;
    setDomainBusy(true);
    setDomainError("");
    try {
      const res = await fetch("/api/connect-domain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, domain: domainInput.trim() }),
      });
      const result = await res.json();
      // message before error: the plan gate returns a sentence worth
      // showing, and the raw code ("plan_required") is not one.
      if (!res.ok) throw new Error(result.message || result.error || "failed");

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
      setDomainInput("");
    } catch (err) {
      setDomainError(err.message);
    } finally {
      setDomainBusy(false);
    }
  }

  async function togglePublish(project) {
    setPublishError("");
    const willPublish = !project.published;
    const base =
      project.client_name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 40) || "site";

    // Slugs are unique across every reseller's account, but RLS only lets
    // this query see this user's own rows plus anyone's *published* ones —
    // another account's unpublished site with the same slug is invisible
    // here by design (we don't want a client-side directory of every
    // slug on the platform). So this pre-check can miss a real collision;
    // the retry loop below is what actually catches it, via the database's
    // own unique constraint on projects.slug.
    let slug = project.slug;
    if (willPublish && !slug) {
      slug = base;
    }

    let attempt = 0;
    let securityErrorRetried = false;
    while (attempt < 5) {
      const updates = { published: willPublish };
      if (willPublish && !project.slug) updates.slug = slug;

      const { data, error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", project.id)
        .select()
        .single();

      if (!error) {
        if (data) setProjects((prev) => prev.map((p) => (p.id === data.id ? data : p)));
        return;
      }

      // Postgres unique_violation on projects_slug_key — someone else
      // already has this exact slug. Try a new random suffix rather than
      // surfacing the raw database error.
      const isSlugCollision =
        error.code === "23505" || /projects_slug_key/i.test(error.message || "");
      if (isSlugCollision && willPublish) {
        attempt++;
        slug = `${base}${Math.floor(100 + Math.random() * 900)}`;
        continue;
      }

      // "SecurityError: The operation is insecure" is the browser (not
      // Postgres) blocking a storage/lock check the auth client makes
      // before sending the request — seen on Safari Private Browsing and
      // in-app browsers (Instagram/TikTok/etc.) that restrict storage.
      // It's usually transient, so retry once before giving up.
      const isBrowserSecurityError = /SecurityError/i.test(error.message || "");
      if (isBrowserSecurityError && !securityErrorRetried) {
        securityErrorRetried = true;
        await new Promise((r) => setTimeout(r, 400));
        continue;
      }

      const message = isBrowserSecurityError
        ? "Your browser blocked a security check needed to publish. If you're in Private Browsing or opened this from another app (Instagram, TikTok, etc.), try opening sitebric.com directly in Safari or Chrome and try again."
        : error.message;
      setPublishError(
        `Couldn't ${project.published ? "unpublish" : "publish"} this site: ${message}`
      );
      return;
    }

    setPublishError(
      "Couldn't find an available web address for this site after several tries — try renaming it slightly and publishing again."
    );
  }

  async function removeProject(id) {
    await supabase.from("projects").delete().eq("id", id);
    setProjects((p) => p.filter((x) => x.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  // Reflects whether a site is actually reachable, not just whether it
  // finished generating. A finished-but-unpublished site isn't on the
  // internet yet, so labelling it "live" was misleading.
  // Re-stitches a multi-page site from the pieces already stored on the
  // row. No model calls, so no generations and no API spend — this exists
  // so a fix to the shared page-switching script can reach sites built
  // before the fix, instead of asking someone to pay to generate again.
  async function rebuildSite(project) {
    setRebuilding(true);
    setError("");
    try {
      const res = await fetch("/api/generate-finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });
      const body = await res.text();
      let result;
      try { result = JSON.parse(body); } catch { result = {}; }
      if (!res.ok) throw new Error(result.error || "Couldn't rebuild this site.");

      const { data } = await supabase
        .from("projects")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setProjects(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setRebuilding(false);
    }
  }

  function projectMeta(project) {
    if (project.status === "generating") {
      const age = Date.now() - new Date(project.created_at).getTime();
      if (age > STALE_GENERATING_MS) return { color: "#F87171", label: "failed" };
      return { color: "rgba(255,255,255,0.85)", label: "generating" };
    }
    if (project.status === "error") return { color: "#F87171", label: "failed" };
    if (project.published) return { color: "#4ADE80", label: "live" };
    // Amber, not grey: an unpublished site is waiting on the user, so it
    // should read as a pending action rather than blend into the card.
    return { color: "#FBBF24", label: "ready to publish" };
  }

  const currentPlan = profile?.plan || "none";
  const limits = PLAN_LIMITS[currentPlan] || PLAN_LIMITS.none;
  // What the sidebar upsell card should point at next — one tier up
  // from wherever the user actually is, not always "Pro".
  const nextPlan =
    currentPlan === "starter" ? "Growth" : currentPlan === "growth" ? "Pro" : "Starter";
  // Matches what /api/generate actually enforces: a crashed generation is
  // not a site, and showing it as one told people they had used up an
  // allowance they still had.
  const sitesUsed = projects.filter((p) => p.status !== "error").length;
  const gensUsed = profile?.generations_used || 0;
  const gensRemaining = Math.max(0, limits.generations - gensUsed);
  // A multi-page build costs several generations, so the option is only
  // offered when the allowance actually covers it — better to grey it out
  // with the reason than to let someone fill in the whole brief and get
  // rejected at the end.
  const canMultiPage = MULTIPAGE_ENABLED && gensRemaining >= MULTIPAGE_COST;
  const searchesUsedBilling = profile?.searches_used || 0;
  const publishedCount = projects.filter((p) => p.published).length;
  const displayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "there";

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  function timeAgo(dateString) {
    const diffMs = Date.now() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(dateString).toLocaleDateString();
  }

  // Real activity, not a fabricated traffic chart: how many sites were
  // created in each of the last 8 weeks, straight from created_at.
  const weeklyCounts = (() => {
    const weeks = 8;
    const buckets = Array(weeks).fill(0);
    const now = Date.now();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    projects.forEach((p) => {
      const age = now - new Date(p.created_at).getTime();
      const idx = weeks - 1 - Math.floor(age / weekMs);
      if (idx >= 0 && idx < weeks) buckets[idx] += 1;
    });
    return buckets;
  })();

  const navItems = [
    { id: "overview", label: "Overview", Icon: IconHome },
    { id: "sites", label: "Sites", Icon: IconSites },
    { id: "leads", label: "Find Leads", Icon: IconLeads },
    { id: "receptionist", label: "Receptionist", Icon: IconBell },
    { id: "invoices", label: "Invoices", Icon: IconInvoice },
    { id: "billing", label: "Billing", Icon: IconBilling },
    { id: "referrals", label: "Referrals", Icon: IconShare },
    { id: "profile", label: "Profile", Icon: IconUser },
    { id: "settings", label: "Settings", Icon: IconSettings },
  ];

  return (
    <div className={`sb-dash-shell${tab === "sites" && active ? " sb-dash-shell--project-open" : ""}`} style={{ height: "100vh", display: "flex", color: t.text, background: t.bg, fontFamily: body, position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes sbDashDrift1 {
          0%   { transform: translate(-50%, 0) scale(1); }
          50%  { transform: translate(-42%, 8%) scale(1.15); }
          100% { transform: translate(-50%, 0) scale(1); }
        }
        @keyframes sbDashDrift2 {
          0%   { transform: translate(0, 0) scale(1); opacity: 0.4; }
          50%  { transform: translate(10%, -8%) scale(1.2); opacity: 0.65; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
        }
        .sb-dash-ambient { position: absolute; inset: 0; overflow: hidden; pointer-events: none; z-index: 0; }
        .sb-dash-orb { position: absolute; border-radius: 50%; filter: blur(60px); }
        .sb-dash-orb-a {
          top: -30%; left: 50%; width: 1100px; height: 1100px;
          background: radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 62%);
          animation: sbDashDrift1 12s ease-in-out infinite;
        }
        .sb-dash-orb-b {
          bottom: -20%; right: -10%; width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 66%);
          animation: sbDashDrift2 15s ease-in-out infinite;
        }

        /* Drifting motes — the same field the login screen uses, so the
           two halves of the product feel like one thing. */
        .sb-dash-motes { position: absolute; inset: 0; width: 100%; height: 100%; }

        /* A specular sweep that crosses the workspace every 16s. This is
           what stops a mostly-empty black panel reading as dead. */
        @keyframes sbDashBeam {
          0%        { transform: translateX(-40%) rotate(9deg); opacity: 0; }
          25%, 60%  { opacity: 1; }
          100%      { transform: translateX(150%) rotate(9deg); opacity: 0; }
        }
        .sb-dash-beam {
          position: absolute; top: -25%; left: 0; width: 34%; height: 150%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent);
          filter: blur(30px);
          animation: sbDashBeam 16s ease-in-out infinite;
        }

        .sb-project-card {
          position: relative;
          transition: transform 0.24s ${t.ease}, box-shadow 0.24s ${t.ease}, border-color 0.24s ${t.ease};
          cursor: pointer;
        }
        /* Light pools in from the top edge on hover rather than the card
           simply changing colour. */
        .sb-project-card::after {
          content: ""; position: absolute; inset: 0; border-radius: inherit;
          background: radial-gradient(130% 80% at 50% -25%, rgba(255,255,255,0.10), transparent 62%);
          opacity: 0; transition: opacity 0.24s ${t.ease}; pointer-events: none;
        }
        .sb-project-card:hover::after { opacity: 1; }
        .sb-project-card:hover {
          transform: translateY(-4px);
          border-color: rgba(255,255,255,0.22);
          box-shadow: 0 18px 44px rgba(0,0,0,0.65),
                      0 0 34px rgba(255,255,255,0.055);
        }

        /* A lit top edge, brightest at the middle — reads as a panel
           catching light rather than an outlined box. */
        .sb-lit-edge { position: relative; }
        .sb-lit-edge::before {
          content: ""; position: absolute; top: 0; left: 10%; right: 10%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent);
          pointer-events: none;
        }

        .sb-sidebar-item {
          position: relative;
          transition: background 0.18s ${t.ease}, border-color 0.18s ${t.ease},
                      box-shadow 0.18s ${t.ease};
        }
        .sb-sidebar-item:hover {
          box-shadow: 0 0 22px rgba(255,255,255,0.045);
          border-color: rgba(255,255,255,0.16);
        }

        .sb-nav-tab {
          transition: background 0.18s ${t.ease}, color 0.18s ${t.ease},
                      box-shadow 0.18s ${t.ease};
        }
        .sb-nav-tab:hover { box-shadow: 0 0 18px rgba(255,255,255,0.05); }

        @media (prefers-reduced-motion: reduce) {
          .sb-dash-orb-a, .sb-dash-orb-b, .sb-dash-beam { animation: none; }
          .sb-project-card, .sb-sidebar-item, .sb-nav-tab { transition: none; }
        }
        /* The desktop layout is a fixed 300px sidebar beside the workspace.
           On a phone that leaves almost nothing for the workspace, so stack
           them instead and let the page scroll normally. */
        @media (max-width: 860px) {
          .sb-dash-shell {
            flex-direction: column;
            height: auto !important;
            min-height: 100vh;
            /* dvh accounts for the iOS Safari toolbar; vh above is the
               fallback for browsers without dvh support. */
            min-height: 100dvh;
          }
          .sb-dash-sidebar {
            width: 100% !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          /* Cap the project list so a long list cannot push the workspace
             off the bottom of the screen. */
          .sb-dash-projects { max-height: 45vh; }
          .sb-dash-main {
            overflow: visible !important;
            min-height: 70vh;
          }
          /* The preview shares a phone screen with a header, a tab row and
             the editor bar. At 70vh there was barely a viewport of site
             left to judge, so it gets most of the screen and the rest
             scrolls. dvh so the iOS toolbar doesn't eat into it. */
          .sb-dash-preview {
            min-height: 78vh;
            min-height: 78dvh;
          }
          /* With a project open, the list above adds nothing but eats
             most of the screen — hide it and rely on the back button
             instead so the preview actually gets room to breathe. */
          /* !important is required here — the sidebar element also carries
             an inline style={{ display: "flex" }}, which otherwise always
             wins over this class and the sidebar never actually hides. */
          .sb-dash-sidebar--project-open { display: none !important; }
          .sb-mobile-back { display: inline-flex !important; }

          /* With a project open the sidebar is gone, so the workspace is
             the entire screen. Pin it to exactly one viewport and let the
             preview take whatever the header and the editor bar don't,
             instead of everything stacking and the page scrolling — which
             is what left barely any site visible. */
          .sb-dash-shell--project-open {
            height: 100dvh !important;
            min-height: 0 !important;
            overflow: hidden;
          }
          .sb-dash-shell--project-open .sb-dash-main {
            overflow: hidden !important;
            min-height: 0 !important;
            height: 100%;
          }
          .sb-dash-shell--project-open .sb-dash-preview {
            min-height: 0 !important;
            flex: 1;
          }

          /* Every pixel the chrome takes is a pixel of site you cannot
             see, so it gets tighter on a phone. */
          .sb-project-header { padding: 10px 12px !important; gap: 8px !important; }
          .sb-view-tabs button { padding: 5px 10px !important; font-size: 11.5px !important; }
          .sb-edit-bar { padding: 10px 12px !important; }
          .sb-overview-grid { grid-template-columns: 1fr !important; }
        }
        /* Nothing in the workspace may scroll the page sideways. A single
           unbreakable string — a long business name, a pasted URL, a
           domain — used to widen the whole layout, which on a phone reads
           as the entire app being broken. */
        .sb-dash-shell { max-width: 100%; overflow-x: hidden; }
        @media (max-width: 860px) {
          .sb-dash-main, .sb-dash-sidebar { max-width: 100%; overflow-x: hidden; }
        }
        .sb-mobile-back { display: none; }
      ` }} />

      {/* Sits above everything at 3.5% — the same grain the login screen
          uses, which is what keeps large black areas from banding. */}
      <FilmGrain opacity={0.035} />

      <div
        className={`sb-dash-sidebar${tab === "sites" && active ? " sb-dash-sidebar--project-open" : ""}`}
        style={{
          width: 272,
          borderRight: `1px solid ${t.border}`,
          display: "flex",
          flexDirection: "column",
          background: t.bgPanel,
          zIndex: 2,
        }}
      >
        <div
          style={{
            padding: "24px 20px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Wordmark size={19} />
          <button onClick={signOut} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 12, cursor: "pointer" }}>
            Sign out
          </button>
        </div>

        {/* ===== TAB NAV ===== */}
        <div style={{ display: "flex", flexDirection: "column", padding: "12px 12px 0" }}>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setTab(item.id);
                setActiveId(null);
              }}
              className="sb-nav-tab"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                textAlign: "left",
                background: tab === item.id ? "rgba(255,255,255,0.06)" : "transparent",
                color: tab === item.id ? "#FFFFFF" : "rgba(255,255,255,0.5)",
                border: `1px solid ${tab === item.id ? "rgba(255,255,255,0.1)" : "transparent"}`,
                borderRadius: 11,
                padding: "11px 14px",
                fontSize: 13.5,
                fontWeight: 500,
                fontFamily: body,
                cursor: "pointer",
                marginBottom: 3,
              }}
            >
              <item.Icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        {tab === "sites" && (
          <>
            <div style={{ padding: 16 }}>
              <button
                onClick={goToNewSiteForm}
                style={{
                  width: "100%",
                  background: accent,
                  color: "#0A0A10",
                  border: "none",
                  borderRadius: 12,
                  padding: "12px 10px",
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: "0 6px 20px rgba(0,0,0,0.4)",
                }}
              >
                + New client site
              </button>
            </div>

            <div style={{ padding: "0 12px 10px" }}>
              <input
                value={siteSearch}
                onChange={(e) => setSiteSearch(e.target.value)}
                placeholder="Search your sites…"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 10,
                  padding: "8px 12px",
                  color: "#fff",
                  fontFamily: body,
                  fontSize: 12,
                  outline: "none",
                }}
              />
            </div>

            <div className="sb-dash-projects" style={{ flex: 1, overflowY: "auto", padding: "0 12px" }}>
              {projects.length === 0 && (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", padding: 12, lineHeight: 1.6 }}>
                  No client sites yet — type a business name and description above, then hit "Generate site" to
                  create your first one.
                </div>
              )}
              {projects.length > 0 &&
                projects.filter((p) => p.client_name.toLowerCase().includes(siteSearch.toLowerCase())).length ===
                  0 && (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", padding: 12 }}>
                    No sites match "{siteSearch}".
                  </div>
                )}
              {projects
                .filter((p) => p.client_name.toLowerCase().includes(siteSearch.toLowerCase()))
                .map((p) => {
                const meta = projectMeta(p);
                return (
                  <div
                    key={p.id}
                    onClick={() => setActiveId(p.id)}
                    className="sb-sidebar-item"
                    style={{
                      cursor: "pointer",
                      padding: "12px 14px",
                      borderRadius: 12,
                      marginBottom: 8,
                      fontSize: 13,
                      border: p.id === activeId ? "1px solid rgba(255,255,255,0.28)" : "1px solid rgba(255,255,255,0.06)",
                      background: p.id === activeId ? "rgba(255,255,255,0.05)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 500 }}>{p.client_name}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProject(p.id);
                        }}
                        style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}
                      >
                        ✕
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, marginTop: 4, color: meta.color }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, boxShadow: `0 0 5px ${meta.color}` }} />
                      {meta.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <div style={{ marginTop: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
          {currentPlan !== "pro" && (
            <div style={{ borderRadius: 14, padding: 18, background: cardBg, border: `1px solid ${t.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 600, fontSize: 13.5, marginBottom: 8 }}>
                <IconSparkle size={15} />
                Upgrade to {nextPlan}
              </div>
              <div style={{ fontSize: 12, color: t.textMuted, lineHeight: 1.55, marginBottom: 16 }}>
                Unlock advanced features and grow your business.
              </div>
              <a
                href="/pricing"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: t.text,
                  textDecoration: "none",
                  background: t.bgInput,
                  border: `1px solid ${t.border}`,
                  borderRadius: 9,
                  padding: "11px 14px",
                }}
              >
                Upgrade now <IconArrowRight size={15} />
              </a>
            </div>
          )}

          <div
            onClick={() => {
              setTab("profile");
              setActiveId(null);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 11,
              borderTop: `1px solid ${t.border}`,
              paddingTop: 18,
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                flexShrink: 0,
                borderRadius: "50%",
                background: t.bgHover,
                border: `1px solid ${t.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 13.5,
                color: t.text,
              }}
            >
              {displayName?.[0]?.toUpperCase() || "?"}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11.5, color: t.textFaint, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.email}
              </div>
            </div>
            <span style={{ color: t.textFaint, display: "flex" }}><IconChevronRight size={14} /></span>
          </div>
        </div>
      </div>

      <div className="sb-dash-main" style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>

        {/* ===== OVERVIEW TAB ===== */}
        {tab === "overview" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "36px 40px 60px", position: "relative", zIndex: 1 }}>
            <DashAmbient />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 28 }}>
                <div>
                  <div style={{ fontFamily: display, fontWeight: 700, fontSize: 28, letterSpacing: "-0.02em", marginBottom: 8 }}>
                    Welcome back, {displayName} 👋
                  </div>
                  <div style={{ fontSize: 14, color: t.textMuted }}>
                    Here's what's happening with your sites today.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                    <span style={{ position: "absolute", left: 14, color: t.textFaint, display: "flex", pointerEvents: "none" }}>
                      <IconSearch size={16} />
                    </span>
                    <input
                      value={siteSearch}
                      onChange={(e) => setSiteSearch(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") setTab("sites");
                      }}
                      placeholder="Search your sites..."
                      style={{
                        background: t.bgInput,
                        border: `1px solid ${t.border}`,
                        borderRadius: 10,
                        padding: "11px 14px 11px 40px",
                        color: t.text,
                        fontFamily: body,
                        fontSize: 13.5,
                        outline: "none",
                        width: 250,
                      }}
                    />
                  </div>
                  <div style={{ color: t.textMuted, display: "flex", cursor: "default" }} title="Notifications">
                    <IconBell size={19} />
                  </div>
                  <div
                    onClick={() => {
                      setTab("profile");
                      setActiveId(null);
                    }}
                    style={{
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                      borderRadius: "50%",
                      background: t.bgHover,
                      border: `1px solid ${t.border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 600,
                      fontSize: 13,
                      color: t.text,
                      cursor: "pointer",
                    }}
                  >
                    {displayName?.[0]?.toUpperCase() || "?"}
                  </div>
                </div>
              </div>

              {/* Stat cards — real numbers only: sites, published, generations and leads
                  usage. No fabricated "views"/"conversion"/"revenue" widgets — Sitebric
                  doesn't track visitor analytics on published sites (yet), so it doesn't
                  claim to. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))", gap: 18, marginBottom: 18 }}>
                {[
                  ["Client Sites", IconSites, sitesUsed, `of ${limits.sites} on your plan`],
                  ["Published Live", IconRocketish, publishedCount, `${sitesUsed - publishedCount} not yet published`],
                  ["Generations Used", IconSparkle, gensUsed, `of ${limits.generations} this month`],
                  ["Leads Found", IconLeads, searchesUsedBilling, `of ${limits.searches} searches this month`],
                ].map(([label, Icon, value, sub]) => (
                  <div
                    key={label}
                    style={{
                      borderRadius: 16,
                      padding: "22px 24px",
                      background: cardBg,
                      border: `1px solid ${t.border}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                      <div style={{ fontSize: 13.5, color: t.textMuted }}>{label}</div>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 9,
                          background: t.bgInput,
                          border: `1px solid ${t.border}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: t.text,
                          flexShrink: 0,
                        }}
                      >
                        <Icon size={15} />
                      </div>
                    </div>
                    <div style={{ fontFamily: display, fontWeight: 700, fontSize: 32, letterSpacing: "-0.02em", marginBottom: 10 }}>{value}</div>
                    <div style={{ fontSize: 12.5, color: t.textFaint }}>{sub}</div>
                  </div>
                ))}
              </div>

              <div className="sb-overview-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Real chart: sites created per week, from created_at — not simulated traffic. */}
                <div style={{ borderRadius: 16, padding: 24, background: cardBg, border: `1px solid ${t.border}` }}>
                  <div style={{ fontFamily: display, fontWeight: 600, fontSize: 16, marginBottom: 5 }}>Sites created</div>
                  <div style={{ fontSize: 12.5, color: t.textFaint, marginBottom: 22 }}>Last 8 weeks</div>
                  {(() => {
                    const w = 100,
                      h = 46,
                      max = Math.max(1, ...weeklyCounts);
                    const stepX = w / (weeklyCounts.length - 1 || 1);
                    const points = weeklyCounts.map((v, i) => [i * stepX, h - (v / max) * h]);
                    const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x},${y}`).join(" ");
                    const areaPath = `${linePath} L ${w},${h} L 0,${h} Z`;
                    return (
                      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: 140, overflow: "visible" }}>
                        <defs>
                          <linearGradient id="ovChartFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
                            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        <path d={areaPath} fill="url(#ovChartFill)" stroke="none" />
                        <path d={linePath} fill="none" stroke="#FFFFFF" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
                        {points.map(([x, y], i) => (
                          <circle key={i} cx={x} cy={y} r="1.6" fill="#FFFFFF" vectorEffect="non-scaling-stroke" />
                        ))}
                      </svg>
                    );
                  })()}
                  {sitesUsed === 0 && (
                    <div style={{ fontSize: 12.5, color: t.textFaint, marginTop: 8 }}>
                      Generate your first site to see activity here.
                    </div>
                  )}
                </div>

                {/* Recent activity — real project rows, not a simulated event feed. */}
                <div style={{ borderRadius: 16, padding: 24, background: cardBg, border: `1px solid ${t.border}` }}>
                  <div style={{ fontFamily: display, fontWeight: 600, fontSize: 16, marginBottom: 18 }}>Recent Activity</div>
                  {recentProjects.length === 0 && (
                    <div style={{ fontSize: 12.5, color: t.textFaint }}>Nothing yet — create your first site to get started.</div>
                  )}
                  {recentProjects.map((p) => {
                    const meta = projectMeta(p);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setTab("sites");
                          setActiveId(p.id);
                        }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: `1px solid ${t.border}`, cursor: "pointer" }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.client_name}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, marginTop: 2, color: meta.color }}>
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color }} />
                            {meta.label}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", flexShrink: 0, marginLeft: 10 }}>{timeAgo(p.created_at)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sb-overview-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 16 }}>
                {/* Sites snapshot */}
                <div style={{ borderRadius: 16, padding: 24, background: cardBg, border: `1px solid ${t.border}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                    <div style={{ fontFamily: display, fontWeight: 600, fontSize: 16 }}>Sites</div>
                    <span
                      onClick={() => setTab("sites")}
                      style={{ fontSize: 12.5, color: t.text, cursor: "pointer", background: t.bgInput, border: `1px solid ${t.border}`, borderRadius: 8, padding: "7px 13px" }}
                    >
                      View all sites
                    </span>
                  </div>
                  {projects.length === 0 && (
                    <div style={{ fontSize: 12.5, color: t.textFaint }}>No sites yet.</div>
                  )}
                  {recentProjects.slice(0, 3).map((p) => {
                    const meta = projectMeta(p);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setTab("sites");
                          setActiveId(p.id);
                        }}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}`, cursor: "pointer" }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{p.client_name}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: meta.color }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", background: meta.color }} />
                          {meta.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Quick actions */}
                <div style={{ borderRadius: 16, padding: 24, background: cardBg, border: `1px solid ${t.border}` }}>
                  <div style={{ fontFamily: display, fontWeight: 600, fontSize: 16, marginBottom: 18 }}>Quick Actions</div>
                  {[
                    [IconPlus, "Create New Site", "Start building a new website", goToNewSiteForm],
                    [IconLeads, "Find Leads", "Search for local businesses to pitch", () => setTab("leads")],
                    [IconBilling, "Manage Billing", "View plan, usage and invoices", () => setTab("billing")],
                  ].map(([Icon, title, desc, onClick]) => (
                    <div
                      key={title}
                      onClick={onClick}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        marginBottom: 10,
                        borderRadius: 11,
                        background: t.bgInput,
                        border: `1px solid ${t.border}`,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ color: t.text, display: "flex", flexShrink: 0 }}><Icon size={17} /></span>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{title}</div>
                        <div style={{ fontSize: 12, color: t.textFaint, marginTop: 2 }}>{desc}</div>
                      </div>
                      <span style={{ color: t.textFaint, display: "flex" }}><IconChevronRight size={15} /></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== SITES TAB ===== */}
        {tab === "sites" && !active && (
          <>
            <DashAmbient />
            <div
              ref={newSiteFormRef}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                padding: "56px 24px",
                position: "relative",
                zIndex: 1,
                overflowY: "auto",
              }}
            >
              <div style={{ fontFamily: display, fontWeight: 700, fontSize: 32, marginBottom: 10, textAlign: "center" }}>
                What client are we building for?
              </div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 36, textAlign: "center" }}>
                Describe the business, generate a full site in seconds.
              </div>

              <div
                style={{
                  width: "100%",
                  maxWidth: 620,
                  borderRadius: 20,
                  padding: 22,
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  backdropFilter: "blur(20px)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  marginBottom: 60,
                }}
              >
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client / business name — e.g. Rosa's Bakery"
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: "13px 16px",
                    color: "#fff",
                    fontFamily: body,
                    fontSize: 14,
                    marginBottom: 12,
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.4)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={4}
                  placeholder="Describe the business & what the site needs — vibe, sections, key info..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 12,
                    padding: "13px 16px",
                    color: "#fff",
                    fontFamily: body,
                    fontSize: 14,
                    resize: "none",
                    outline: "none",
                    marginBottom: 14,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.4)")}
                  onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                />

                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "100%",
                    boxSizing: "border-box",
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.04)",
                    borderRadius: 12,
                    padding: "12px 14px",
                    marginBottom: 14,
                    fontSize: 13,
                    fontWeight: 600,
                    color: "rgba(255,255,255,0.85)",
                    cursor: photoUploading ? "default" : "pointer",
                  }}
                >
                  {photoUploading ? "Uploading…" : "📷 Upload real photos of the business (optional)"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoUpload}
                    disabled={photoUploading}
                    style={{ display: "none" }}
                  />
                </label>

                {photoUrls.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                    {photoUrls.map((url) => (
                      <div key={url} style={{ position: "relative", width: 56, height: 56 }}>
                        <img
                          src={url}
                          alt=""
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: "cover",
                            borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.15)",
                          }}
                        />
                        <button
                          onClick={() => removePhoto(url)}
                          style={{
                            position: "absolute",
                            top: -6,
                            right: -6,
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            background: "#F87171",
                            color: "#fff",
                            border: "none",
                            fontSize: 11,
                            cursor: "pointer",
                            lineHeight: 1,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {!showContactFields ? (
                  <button
                    onClick={() => setShowContactFields(true)}
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.18)",
                      borderRadius: 12,
                      padding: "12px 14px",
                      marginBottom: 14,
                      fontSize: 13,
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.85)",
                      cursor: "pointer",
                    }}
                  >
                    + Add contact details (recommended — makes Call Now, Maps and booking actually work)
                  </button>
                ) : (
                  <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)", letterSpacing: "0.04em" }}>
                      All optional, but without them Call Now, the map and the booking form fall back to generic
                      placeholders instead of working for real.
                    </div>
                    {[
                      { value: phone, set: setPhone, placeholder: "Business phone — e.g. (555) 123-4567" },
                      { value: address, set: setAddress, placeholder: "Business address — for the Google Maps section" },
                      { value: ownerEmail, set: setOwnerEmail, placeholder: "Owner's email — where booking inquiries get sent" },
                      { value: calendlyUrl, set: setCalendlyUrl, placeholder: "Calendly (or other scheduling) link — optional" },
                      {
                        value: orderLinks,
                        set: setOrderLinks,
                        placeholder:
                          "Ordering links for restaurants — paste DoorDash, Uber Eats, Grubhub etc. (one per line)",
                        multiline: true,
                      },
                    ].map((f) =>
                      f.multiline ? (
                        <textarea
                          key={f.placeholder}
                          value={f.value}
                          onChange={(e) => f.set(e.target.value)}
                          placeholder={f.placeholder}
                          rows={3}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 12,
                            padding: "13px 16px",
                            color: "#fff",
                            fontFamily: body,
                            fontSize: 14,
                            outline: "none",
                            resize: "vertical",
                          }}
                          onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.4)")}
                          onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                        />
                      ) : (
                      <input
                        key={f.placeholder}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        placeholder={f.placeholder}
                        style={{
                          width: "100%",
                          boxSizing: "border-box",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 12,
                          padding: "13px 16px",
                          color: "#fff",
                          fontFamily: body,
                          fontSize: 14,
                          outline: "none",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.4)")}
                        onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                      />
                      )
                    )}
                  </div>
                )}

                <StylePicker value={style} onChange={setStyle} disabled={busy} />

                {MULTIPAGE_ENABLED && (
                <>
                {/* Priced rather than plan-gated: a four-page build burns
                    roughly three times the tokens, so it costs three
                    generations on every plan instead of being locked to
                    the expensive tiers. */}
                <button
                  type="button"
                  onClick={() => canMultiPage && !busy && setMultiPage((v) => !v)}
                  disabled={!canMultiPage || busy}
                  aria-pressed={multiPage}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    textAlign: "left",
                    background: multiPage ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${multiPage ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.12)"}`,
                    borderRadius: 12,
                    padding: "13px 14px",
                    marginBottom: 14,
                    cursor: canMultiPage ? "pointer" : "not-allowed",
                    opacity: canMultiPage ? 1 : 0.5,
                    fontFamily: body,
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flexShrink: 0,
                      width: 18,
                      height: 18,
                      marginTop: 1,
                      borderRadius: 5,
                      border: `1px solid ${multiPage ? "#fff" : "rgba(255,255,255,0.35)"}`,
                      background: multiPage ? "#fff" : "transparent",
                      color: "#0A0A10",
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: "17px",
                      textAlign: "center",
                    }}
                  >
                    {multiPage ? "✓" : ""}
                  </span>
                  <span style={{ flex: 1 }}>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        flexWrap: "wrap",
                        fontSize: 13.5,
                        fontWeight: 600,
                        color: "rgba(255,255,255,0.92)",
                        marginBottom: 3,
                      }}
                    >
                      Multi-page site
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                          textTransform: "uppercase",
                          color: "rgba(255,255,255,0.55)",
                          border: "1px solid rgba(255,255,255,0.2)",
                          borderRadius: 999,
                          padding: "2px 7px",
                        }}
                      >
                        Uses {MULTIPAGE_COST} generations
                      </span>
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>
                      {canMultiPage
                        ? "Home, Services, About and Contact as four real pages instead of one long scrolling page."
                        : `You have ${gensRemaining} generation${gensRemaining === 1 ? "" : "s"} left this month — a multi-page site needs ${MULTIPAGE_COST}.`}
                    </span>
                  </span>
                </button>
                </>
                )}

                <button
                  onClick={generate}
                  disabled={busy || !clientName.trim() || !prompt.trim()}
                  style={{
                    width: "100%",
                    background: busy ? "rgba(255,255,255,0.08)" : accent,
                    color: busy ? "rgba(255,255,255,0.4)" : "#0A0A10",
                    border: "none",
                    borderRadius: 12,
                    padding: "14px 10px",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: busy ? "default" : "pointer",
                    boxShadow: busy ? "none" : "0 6px 20px rgba(0,0,0,0.4)",
                  }}
                >
                  {busy
                    ? multiPage
                      ? "Generating 4 pages…"
                      : "Generating…"
                    : multiPage
                      ? `Generate 4-page site → (${MULTIPAGE_COST} generations)`
                      : "Generate site →"}
                </button>

                {busy && genStart && (
                  <GeneratingProgress
                    startedAt={genStart.at}
                    multiPage={genStart.multiPage}
                    stage={genStage}
                    accent={accent}
                    body={body}
                  />
                )}
                {error && (
                  <div
                    style={{
                      fontSize: 12,
                      color: "#FCA5A5",
                      background: "rgba(220,38,38,0.1)",
                      border: "1px solid rgba(220,38,38,0.25)",
                      borderRadius: 10,
                      padding: "10px 14px",
                      marginTop: 12,
                    }}
                  >
                    {error}
                  </div>
                )}
              </div>

              {projects.length > 0 && (
                <div style={{ width: "100%", maxWidth: 1000 }}>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 16, fontWeight: 500 }}>
                    Your client sites
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 18 }}>
                    {projects
                      .filter((p) => p.client_name.toLowerCase().includes(siteSearch.toLowerCase()))
                      .map((p) => {
                      const meta = projectMeta(p);
                      return (
                        <div
                          key={p.id}
                          onClick={() => setActiveId(p.id)}
                          className="sb-project-card"
                          style={{
                            borderRadius: 16,
                            border: "1px solid rgba(255,255,255,0.08)",
                            background: "rgba(255,255,255,0.03)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: 100,
                              position: "relative",
                              overflow: "hidden",
                              background:
                                p.status === "done"
                                  ? "linear-gradient(135deg, rgba(255,255,255,0.14), rgba(255,255,255,0.04))"
                                  : "rgba(255,255,255,0.03)",
                            }}
                          >
                            {p.status === "done" && p.code ? (
                              <div
                                style={{
                                  width: 1400,
                                  height: 900,
                                  transform: "scale(0.19)",
                                  transformOrigin: "top left",
                                  pointerEvents: "none",
                                }}
                              >
                                <iframe
                                  title={`${p.client_name} thumbnail`}
                                  srcDoc={p.code}
                                  sandbox="allow-scripts"
                                  scrolling="no"
                                  style={{ width: 1400, height: 900, border: "none" }}
                                />
                              </div>
                            ) : (
                              <div
                                style={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontFamily: display,
                                  fontWeight: 700,
                                  fontSize: 22,
                                  color: "rgba(255,255,255,0.15)",
                                }}
                              >
                                {p.client_name.slice(0, 1).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div style={{ padding: "12px 14px" }}>
                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{p.client_name}</div>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: meta.color }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: meta.color, boxShadow: `0 0 5px ${meta.color}` }} />
                              {meta.label}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {tab === "sites" && active && (
          <>
            <div
              className="sb-project-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 10,
                padding: "16px 20px",
                borderBottom: "1px solid rgba(255,255,255,0.08)",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <button
                  onClick={() => setActiveId(null)}
                  className="sb-mobile-back"
                  style={{
                    alignItems: "center",
                    gap: 4,
                    background: "none",
                    border: "none",
                    color: "rgba(255,255,255,0.6)",
                    fontSize: 13,
                    fontFamily: body,
                    cursor: "pointer",
                    padding: "4px 4px 4px 0",
                    flexShrink: 0,
                  }}
                >
                  ← Sites
                </button>
                <span
                  style={{
                    fontSize: 14,
                    fontFamily: display,
                    fontWeight: 600,
                    // Without these the name sets the row's width, and a
                    // long one pushes the whole page wider than the phone.
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    minWidth: 0,
                  }}
                >
                  {active.client_name}
                </span>
                {/* Which look this one was built in. Read off the stored
                    choice rather than guessed from the code, so it stays
                    right for sites built before the picker existed —
                    those are all "auto", which is what they were. */}
                {active.status === "done" && active.style && active.style !== "auto" && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.16)",
                      borderRadius: 999,
                      padding: "2px 8px",
                      flexShrink: 0,
                    }}
                  >
                    {styleById(active.style).label}
                  </span>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                {active.published && (
                  <a
                    href={active.slug ? `https://${active.slug}.sitebric.com` : `/s/${active.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 12, color: "#FFFFFF", textDecoration: "none" }}
                  >
                    {active.slug ? `${active.slug}.sitebric.com` : "View live link"} →
                  </a>
                )}
                {active.published && (
                  <>
                    <button
                      onClick={() => {
                        const liveUrl = active.slug
                          ? `https://${active.slug}.sitebric.com`
                          : `https://sitebric.com/s/${active.id}`;
                        navigator.clipboard.writeText(liveUrl);
                        setShareCopied(true);
                        setTimeout(() => setShareCopied(false), 2000);
                      }}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        color: "#F2F0FA",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        padding: "6px 12px",
                        fontFamily: display,
                        fontWeight: 700,
                        fontSize: 12,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <IconShare size={12} />
                      {shareCopied ? "Copied" : "Copy link"}
                    </button>
                    {isMobileDevice ? (
                      <a
                        href={`sms:?&body=${encodeURIComponent(
                          `Hey — built a quick website preview for ${active.client_name}, take a look: ${
                            active.slug ? `https://${active.slug}.sitebric.com` : `https://sitebric.com/s/${active.id}`
                          }`
                        )}`}
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "#F2F0FA",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontFamily: display,
                          fontWeight: 700,
                          fontSize: 12,
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        Text to prospect
                      </a>
                    ) : (
                      <a
                        href={`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(
                          `A quick website preview for ${active.client_name}`
                        )}&body=${encodeURIComponent(
                          `Hey — built a quick website preview for ${active.client_name}, take a look: ${
                            active.slug ? `https://${active.slug}.sitebric.com` : `https://sitebric.com/s/${active.id}`
                          }`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          background: "rgba(255,255,255,0.06)",
                          color: "#F2F0FA",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontFamily: display,
                          fontWeight: 700,
                          fontSize: 12,
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        Email to prospect
                      </a>
                    )}
                  </>
                )}
                <button
                  onClick={() => togglePublish(active)}
                  disabled={active.status !== "done"}
                  style={{
                    background: active.published ? "rgba(255,255,255,0.08)" : accent,
                    color: active.published ? "#F2F0FA" : "#0A0A10",
                    border: active.published ? "1px solid rgba(255,255,255,0.15)" : "none",
                    borderRadius: 8,
                    padding: "6px 14px",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: active.status !== "done" ? "default" : "pointer",
                    opacity: active.status !== "done" ? 0.4 : 1,
                  }}
                >
                  {active.published ? "Unpublish" : "Publish"}
                </button>
              </div>
              <div className="sb-view-tabs" style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 3 }}>
                <button
                  onClick={() => setView("preview")}
                  style={{
                    background: view === "preview" ? "rgba(255,255,255,0.1)" : "none",
                    border: "none",
                    color: "#F2F0FA",
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Preview
                </button>
                <button
                  onClick={() => setView("settings")}
                  style={{
                    background: view === "settings" ? "rgba(255,255,255,0.1)" : "none",
                    border: "none",
                    color: "#F2F0FA",
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Settings
                </button>
                <button
                  onClick={() => setPreviewFull(true)}
                  className="sb-fullscreen-tab"
                  title="View the site full screen"
                  style={{
                    background: "none",
                    border: "none",
                    color: "#F2F0FA",
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Full screen
                </button>
                <button
                  onClick={() => setView("inquiries")}
                  style={{
                    background: view === "inquiries" ? "rgba(255,255,255,0.1)" : "none",
                    border: "none",
                    color: "#F2F0FA",
                    fontSize: 12,
                    padding: "6px 14px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontWeight: 500,
                  }}
                >
                  Inquiries
                </button>
              </div>
            </div>
            {publishError && (
              <div
                style={{
                  fontSize: 12,
                  color: "#FCA5A5",
                  background: "rgba(220,38,38,0.1)",
                  borderBottom: "1px solid rgba(220,38,38,0.25)",
                  padding: "10px 20px",
                }}
              >
                {publishError}
              </div>
            )}
            {active.published && (
              <div
                style={{
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                {active.custom_domain ? (
                  <div>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
                      Connected domain: <span style={{ color: "#FFFFFF" }}>{active.custom_domain}</span>
                    </span>
                    <div
                      style={{
                        marginTop: 10,
                        fontSize: 12,
                        lineHeight: 1.6,
                        color: "rgba(255,255,255,0.72)",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 10,
                        padding: "12px 14px",
                        maxWidth: 520,
                      }}
                    >
                      <strong style={{ display: "block", marginBottom: 6, color: "#F2F0FA" }}>
                        One more step — point the domain here
                      </strong>
                      Log into wherever <code>{active.custom_domain}</code> was purchased (Namecheap,
                      GoDaddy, etc.), find its DNS or nameserver settings, and set the nameservers to:
                      <div
                        style={{
                          marginTop: 8,
                          fontFamily: "monospace",
                          fontSize: 12,
                          background: "rgba(0,0,0,0.25)",
                          borderRadius: 6,
                          padding: "8px 10px",
                        }}
                      >
                        ns1.vercel-dns.com
                        <br />
                        ns2.vercel-dns.com
                      </div>
                      <div style={{ marginTop: 8, color: "rgba(255,255,255,0.5)" }}>
                        This can take anywhere from a few minutes to a few hours to take effect. Once it
                        does, the domain will start showing this site automatically.
                      </div>
                    </div>
                  </div>
                ) : !canUseCustomDomain(profile?.plan) ? (
                  /* Say so before they type a domain in. Letting someone
                     fill the box and press Connect only to be told no is
                     the worst version of a plan gate. */
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.6, maxWidth: 520 }}>
                    Connecting a client&apos;s own domain is on Growth and Pro. Until then this
                    site is live on its own sitebric.com address, which you can hand over as-is.{" "}
                    <button
                      onClick={() => setTab("invoices")}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        color: "#FFFFFF",
                        fontFamily: body,
                        fontSize: 12,
                        fontWeight: 600,
                        textDecoration: "underline",
                        cursor: "pointer",
                      }}
                    >
                      See plans
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <input
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="clientswebsite.com"
                        style={{
                          background: "rgba(255,255,255,0.04)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          padding: "6px 10px",
                          color: "#fff",
                          fontFamily: body,
                          fontSize: 12,
                          outline: "none",
                          width: 220,
                        }}
                      />
                      <button
                        onClick={() => connectDomain(active)}
                        disabled={domainBusy || !domainInput.trim()}
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#F2F0FA",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontFamily: display,
                          fontWeight: 700,
                          fontSize: 12,
                          cursor: domainBusy ? "default" : "pointer",
                        }}
                      >
                        {domainBusy ? "Connecting…" : "Connect domain"}
                      </button>
                      {domainError && (
                        <span style={{ fontSize: 11, color: "#FCA5A5" }}>{domainError}</span>
                      )}
                    </div>
                    <a
                      href="https://www.namecheap.com/domains/registration/results/"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-block",
                        marginTop: 10,
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: display,
                        background: accent,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        textDecoration: "none",
                      }}
                    >
                      Don't have a domain yet? Search for one on Namecheap →
                    </a>
                  </div>
                )}
              </div>
            )}
            {/* Rendered into document.body, not here. position:fixed is
                measured against the nearest ancestor carrying a transform,
                filter or backdrop-filter rather than the viewport, and the
                workspace has several — so the overlay was being boxed into
                a band in the middle of the screen with the site clipped,
                instead of covering it. A portal has no ancestors to be
                trapped by. */}
            {previewFull && active.status === "done" && typeof document !== "undefined" && createPortal(
              (
              <div
                style={{
                  position: "fixed",
                  inset: 0,
                  zIndex: 100,
                  background: "#0A0A10",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    padding: "10px 14px",
                    borderBottom: "1px solid rgba(255,255,255,0.12)",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontFamily: display,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {active.client_name}
                  </span>
                  <button
                    onClick={() => setPreviewFull(false)}
                    style={{
                      background: "rgba(255,255,255,0.1)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: 8,
                      padding: "8px 16px",
                      color: "#fff",
                      fontFamily: body,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Done
                  </button>
                </div>
                {/* Same absolute-inset trick as the inline preview: a
                    percentage height on an iframe does not resolve
                    through a flex chain. */}
                <div style={{ flex: 1, position: "relative", minHeight: 0 }}>
                  <iframe
                    title="full screen preview"
                    srcDoc={withPreviewAnchorFix(active.code)}
                    sandbox="allow-scripts allow-modals allow-forms allow-popups allow-top-navigation-to-custom-protocols"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "white" }}
                  />
                </div>
              </div>
              ),
              document.body
            )}
            <div className="sb-dash-preview" style={{ flex: 1, background: "#0A0A10", minHeight: 0, position: "relative" }}>
              {active.status === "generating" && (
                <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                  Generating…
                </div>
              )}
              {active.status === "done" && view === "preview" && (
                // An iframe's percentage height doesn't reliably resolve
                // through a chain of flex containers (a long-standing
                // browser quirk for replaced elements) — it was silently
                // collapsing to the ~150px UA default on mobile, where the
                // shell layout switches to a stack of nested flex boxes
                // with no single ancestor giving it an explicit height.
                // Absolute-positioning it against this relatively
                // positioned parent sidesteps that entirely.
                <iframe
                  ref={previewFrameRef}
                  title="preview"
                  srcDoc={withPreviewAnchorFix(active.code)}
                  sandbox="allow-scripts allow-modals allow-forms allow-popups allow-top-navigation-to-custom-protocols"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: "none", background: "white" }}
                />
              )}
              {active.status === "done" && view === "settings" && (
                <div style={{ height: "100%", overflow: "auto", padding: 20, maxWidth: 480 }}>
                  {active.multi_page && active.build?.pages && (
                    <div
                      style={{
                        marginBottom: 20,
                        padding: "14px 16px",
                        borderRadius: 12,
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#F2F0FA", marginBottom: 4 }}>
                        Rebuild pages
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.6, marginBottom: 12 }}>
                        Re-stitches this site from the four pages already saved for it, picking up any
                        improvements to how the pages link together. It generates nothing new, so it costs
                        no generations.
                      </div>
                      <button
                        onClick={() => rebuildSite(active)}
                        disabled={rebuilding}
                        style={{
                          background: "rgba(255,255,255,0.1)",
                          border: "1px solid rgba(255,255,255,0.22)",
                          borderRadius: 10,
                          padding: "10px 16px",
                          color: "#fff",
                          fontFamily: body,
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: rebuilding ? "default" : "pointer",
                        }}
                      >
                        {rebuilding ? "Rebuilding…" : "Rebuild — free"}
                      </button>
                    </div>
                  )}
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 20, lineHeight: 1.6 }}>
                    Contact info for {active.client_name}. Saving updates the live page too — Call Now, the map,
                    and the booking link all change to match.
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>PHONE</span>
                      <input
                        value={settingsPhone}
                        onChange={(e) => setSettingsPhone(e.target.value)}
                        placeholder="(555) 123-4567"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 10,
                          padding: "11px 14px",
                          color: "#fff",
                          fontFamily: body,
                          fontSize: 14,
                          outline: "none",
                        }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>ADDRESS</span>
                      <input
                        value={settingsAddress}
                        onChange={(e) => setSettingsAddress(e.target.value)}
                        placeholder="123 Main St, City, ST"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 10,
                          padding: "11px 14px",
                          color: "#fff",
                          fontFamily: body,
                          fontSize: 14,
                          outline: "none",
                        }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>OWNER EMAIL</span>
                      <input
                        value={settingsOwnerEmail}
                        onChange={(e) => setSettingsOwnerEmail(e.target.value)}
                        placeholder="owner@business.com — where inquiries get emailed"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 10,
                          padding: "11px 14px",
                          color: "#fff",
                          fontFamily: body,
                          fontSize: 14,
                          outline: "none",
                        }}
                      />
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>BOOKING LINK</span>
                      <input
                        value={settingsCalendlyUrl}
                        onChange={(e) => setSettingsCalendlyUrl(e.target.value)}
                        placeholder="Calendly or other scheduling link"
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 10,
                          padding: "11px 14px",
                          color: "#fff",
                          fontFamily: body,
                          fontSize: 14,
                          outline: "none",
                        }}
                      />
                    </label>
                    <button
                      onClick={saveSettings}
                      disabled={settingsBusy}
                      style={{
                        background: settingsBusy ? "rgba(255,255,255,0.08)" : accent,
                        color: settingsBusy ? "rgba(255,255,255,0.4)" : "#0A0A10",
                        border: "none",
                        borderRadius: 10,
                        padding: "12px 20px",
                        fontFamily: display,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: settingsBusy ? "default" : "pointer",
                        marginTop: 4,
                      }}
                    >
                      {settingsBusy ? "Saving…" : "Save"}
                    </button>
                    {settingsSaved && !settingsBusy && (
                      <div style={{ fontSize: 12, color: "#4ADE80" }}>Saved.</div>
                    )}
                    {settingsError && (
                      <div style={{ fontSize: 12, color: "#FCA5A5" }}>{settingsError}</div>
                    )}
                  </div>
                </div>
              )}
              {active.status === "done" && view === "inquiries" && (
                <div style={{ height: "100%", overflow: "auto", padding: 20 }}>
                  {inquiriesLoading && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Loading…</div>
                  )}
                  {!inquiriesLoading && inquiries.length === 0 && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.6 }}>
                      No inquiries yet. When a visitor submits {active.client_name}'s booking/contact form, it
                      shows up here — and gets emailed to the business owner, if an owner email was set when
                      this site was generated.
                    </div>
                  )}
                  {!inquiriesLoading &&
                    inquiries.map((inq) => (
                      <div
                        key={inq.id}
                        style={{
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          padding: "14px 16px",
                          marginBottom: 10,
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
                          <span style={{ fontFamily: display, fontWeight: 600, fontSize: 13.5 }}>{inq.name}</span>
                          <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)", whiteSpace: "nowrap" }}>
                            {new Date(inq.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.55)", marginBottom: inq.message ? 8 : 0 }}>
                          {inq.contact}
                        </div>
                        {inq.message && (
                          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.5 }}>
                            {inq.message}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
            {active.status === "done" && (
              <div
                className="sb-edit-bar"
                style={{
                  padding: "14px 20px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.015)",
                  flexShrink: 0,
                }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <input
                    value={editInstruction}
                    onChange={(e) => setEditInstruction(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !editBusy) editSite();
                    }}
                    placeholder="Describe a change — e.g. 'make the hero image a plumber instead' or 'add a testimonials section'"
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: "#fff",
                      fontFamily: body,
                      fontSize: 13,
                      outline: "none",
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.4)")}
                    onBlur={(e) => (e.target.style.borderColor = "rgba(255,255,255,0.12)")}
                  />
                  <button
                    onClick={editSite}
                    disabled={editBusy || !editInstruction.trim()}
                    style={{
                      background: editBusy ? "rgba(255,255,255,0.08)" : accent,
                      color: editBusy ? "rgba(255,255,255,0.4)" : "#0A0A10",
                      border: "none",
                      borderRadius: 10,
                      padding: "11px 20px",
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: editBusy ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {editBusy ? "Applying…" : "Apply edit"}
                  </button>
                </div>

                {/* The logo sits beside the chat box rather than inside it
                    because it isn't an instruction — it's a file, it takes
                    effect immediately, and unlike an edit it is free. */}
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    flexWrap: "wrap",
                    marginTop: 10,
                  }}
                >
                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 9,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#F2F0FA",
                      cursor: logoBusy ? "default" : "pointer",
                      opacity: logoBusy ? 0.5 : 1,
                    }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      disabled={logoBusy}
                      onChange={(e) => handleLogoFile(e, active)}
                      style={{ display: "none" }}
                    />
                    {logoBusy
                      ? "Working…"
                      : logoUrlOf(active)
                        ? "Replace logo"
                        : "Upload logo"}
                  </label>

                  {logoUrlOf(active) && !logoBusy && (
                    <>
                      <img
                        src={logoUrlOf(active)}
                        alt="Current logo"
                        style={{
                          height: 26,
                          width: "auto",
                          maxWidth: 110,
                          objectFit: "contain",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.06)",
                          padding: 3,
                        }}
                      />
                      <button
                        onClick={() => setLogo(active, null)}
                        style={{
                          background: "none",
                          border: "none",
                          color: "rgba(255,255,255,0.5)",
                          fontSize: 12,
                          cursor: "pointer",
                          textDecoration: "underline",
                          padding: 0,
                        }}
                      >
                        Use the name instead
                      </button>
                    </>
                  )}

                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.35)" }}>
                    Free — doesn&apos;t use a generation
                  </span>

                  <span
                    aria-hidden="true"
                    style={{
                      width: 1,
                      height: 18,
                      background: "rgba(255,255,255,0.12)",
                      margin: "0 2px",
                    }}
                  />

                  <button
                    onClick={() => makeShareLink(active)}
                    disabled={clientLinkBusy}
                    style={{
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: 9,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#F2F0FA",
                      cursor: clientLinkBusy ? "default" : "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {clientLinkBusy
                      ? "Working…"
                      : clientLinkCopied
                        ? "Link copied ✓"
                        : "Copy link for client"}
                  </button>
                </div>

                {clientLinkUrl && (
                  <div
                    style={{
                      marginTop: 8,
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <input
                      readOnly
                      value={clientLinkUrl}
                      onFocus={(e) => e.target.select()}
                      style={{
                        flex: "1 1 260px",
                        minWidth: 0,
                        background: "rgba(0,0,0,0.35)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        padding: "8px 10px",
                        color: "#F2F0FA",
                        fontSize: 12,
                        fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      }}
                    />
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.4)" }}>
                      Anyone with this link can see the site. It won&apos;t show up in Google, and
                      you don&apos;t have to publish.
                    </span>
                  </div>
                )}

                {clientLinkError && (
                  <div style={{ fontSize: 12, color: "#FCA5A5", marginTop: 8 }}>{clientLinkError}</div>
                )}

                {logoError && (
                  <div style={{ fontSize: 12, color: "#FCA5A5", marginTop: 8 }}>{logoError}</div>
                )}
                {editError && (
                  <div style={{ fontSize: 12, color: "#FCA5A5", marginTop: 8 }}>{editError}</div>
                )}
              </div>
            )}
          </>
        )}

        {/* ===== FIND LEADS TAB ===== */}
        {tab === "leads" && (
          <div style={{ padding: "48px 40px", maxWidth: 1200, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Find Leads</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 12 }}>
              Search for local businesses with no website — instant client leads.
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                fontWeight: 600,
                color: "rgba(255,255,255,0.72)",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 999,
                padding: "5px 12px",
                marginBottom: 20,
              }}
            >
              {profile?.searches_used ?? 0} / {limits.searches} searches used this month
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 22,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 24,
              }}
            >
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <input
                  value={leadCategory}
                  onChange={(e) => setLeadCategory(e.target.value)}
                  placeholder="Business type — e.g. locksmith"
                  style={{
                    flex: "1 1 200px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "#fff",
                    fontFamily: body,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                <input
                  value={leadLocation}
                  onChange={(e) => setLeadLocation(e.target.value)}
                  placeholder="City — e.g. Austin, Manchester, Lyon"
                  style={{
                    flex: "1 1 200px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "#fff",
                    fontFamily: body,
                    fontSize: 14,
                    outline: "none",
                  }}
                />
                {/* Which country decides which Manchester. Defaults to the
                    browser's region, and to the request's own country on
                    the server when the browser doesn't name one. */}
                <select
                  value={leadCountry}
                  onChange={(e) => setLeadCountry(e.target.value)}
                  aria-label="Country to search in"
                  style={{
                    flex: "0 1 190px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: "12px 14px",
                    color: "#fff",
                    fontFamily: body,
                    fontSize: 14,
                    outline: "none",
                  }}
                >
                  <option value="" style={{ background: "#111" }}>
                    Detect my country
                  </option>
                  {COUNTRY_CODES.map((code) => (
                    <option key={code} value={code} style={{ background: "#111" }}>
                      {countryLabel(code)}
                    </option>
                  ))}
                </select>
                <button
                  onClick={findLeads}
                  disabled={leadBusy || !leadCategory.trim() || !leadLocation.trim()}
                  style={{
                    background: leadBusy ? "rgba(255,255,255,0.08)" : accent,
                    color: leadBusy ? "rgba(255,255,255,0.4)" : "#0A0A10",
                    border: "none",
                    borderRadius: 10,
                    padding: "12px 22px",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: leadBusy ? "default" : "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {leadBusy ? "Searching…" : "Search"}
                </button>
              </div>
              {leadError && (
                <div style={{ fontSize: 12, color: "#FCA5A5", marginTop: 12 }}>{leadError}</div>
              )}
            </div>

            {/* Search results and the call list are the same tab, because
                they are the same job: the list is what a search is FOR.
                A separate nav entry would have made saving feel like
                filing rather than like working. */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
              {[
                ["search", leadResults ? `Results (${leadResults.length})` : "Search results"],
                ["saved", `My call list${savedLeads?.length ? ` (${savedLeads.length})` : ""}`],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setLeadView(id)}
                  style={{
                    background: leadView === id ? "rgba(255,255,255,0.1)" : "transparent",
                    border: "1px solid",
                    borderColor: leadView === id ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.08)",
                    borderRadius: 999,
                    padding: "7px 16px",
                    color: leadView === id ? "#FFFFFF" : "rgba(255,255,255,0.5)",
                    fontFamily: body,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {savedError && (
              <div style={{ fontSize: 12.5, color: "#FCA5A5", marginBottom: 14 }}>{savedError}</div>
            )}

            {leadView === "search" && (
              <>
                {leadResults && leadResults.length === 0 && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
                    No businesses found for that search — try a different city or category.
                  </div>
                )}

                {!leadResults && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
                    Search above to pull real businesses off Google Maps. Click any result to get
                    their details and the exact words to say when you call them.
                  </div>
                )}

                {leadResults && leadResults.length > 0 && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 14 }}>
                    <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{leadResults.length}</span>{" "}
                    {leadResults.length === 1 ? "business" : "businesses"} found
                    {leadResults.filter((l) => !l.hasWebsite).length > 0 && (
                      <>
                        {" — "}
                        <span style={{ color: "#4ADE80", fontWeight: 600 }}>
                          {leadResults.filter((l) => !l.hasWebsite).length} with no website
                        </span>
                        , shown first
                      </>
                    )}
                    {". Click one for their details and a call script."}
                  </div>
                )}

                {leadResults && leadResults.length > 0 && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
                      gap: 14,
                    }}
                  >
                    {leadResults.map((lead) => (
                      <LeadResultCard
                        key={lead.id}
                        lead={lead}
                        built={siteForLead(lead).built}
                        saved={isSaved(lead.id)}
                        onOpen={() => setOpenLead(lead)}
                        onSave={(l) => saveLead(l, leadSearchedFor)}
                        onUnsave={unsaveLead}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {leadView === "saved" && (
              <>
                {savedBusy && savedLeads === null && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Loading your list…</div>
                )}

                {savedLeads && savedLeads.length === 0 && (
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 1.7 }}>
                    Nothing saved yet. Search for businesses, then press Save on the ones worth
                    calling — they stay here after you close the tab, and you can download the whole
                    list as a spreadsheet.
                  </div>
                )}

                {savedLeads && savedLeads.length > 0 && (
                  <>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                        marginBottom: 14,
                      }}
                    >
                      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>
                        <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{savedLeads.length}</span>{" "}
                        {savedLeads.length === 1 ? "business" : "businesses"} to call
                      </div>
                      <button
                        onClick={downloadSavedLeads}
                        style={{
                          background: accent,
                          color: "#0A0A10",
                          border: "none",
                          borderRadius: 10,
                          padding: "10px 18px",
                          fontFamily: display,
                          fontWeight: 700,
                          fontSize: 13,
                          cursor: "pointer",
                        }}
                      >
                        Download as spreadsheet
                      </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {savedLeads.map((row) => {
                        const lead = normalizeSaved(row);
                        return (
                          <SavedLeadRow
                            key={row.place_id}
                            row={row}
                            lead={lead}
                            built={siteForLead(lead).built}
                            onOpen={() => setOpenLead(lead)}
                            onRemove={unsaveLead}
                          />
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            )}

            {openLead && (
              <LeadDetail
                lead={openLead}
                /* A saved lead remembers the search it came from, and that
                   is the one the script should use — the boxes at the top
                   may say something else entirely by the time the call
                   list is opened. */
                category={
                  savedLeads?.find((l) => l.place_id === openLead.id)?.category ||
                  leadSearchedFor.category ||
                  ""
                }
                location={
                  savedLeads?.find((l) => l.place_id === openLead.id)?.location ||
                  leadSearchedFor.location ||
                  ""
                }
                built={siteForLead(openLead).built}
                link={siteForLead(openLead).link}
                saved={isSaved(openLead.id)}
                onSave={(lead) => saveLead(lead, leadSearchedFor)}
                onUnsave={unsaveLead}
                onGenerate={generateForLead}
                onClose={() => setOpenLead(null)}
              />
            )}
          </div>
        )}

        {/* ===== RECEPTIONIST TAB ===== */}
        {tab === "receptionist" && (
          <div>
            <h2 style={{ fontFamily: display, fontSize: 20, fontWeight: 700, margin: "0 0 6px" }}>
              AI Receptionist
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 22px", lineHeight: 1.6, maxWidth: 620 }}>
              A number that answers when your client can&apos;t. It takes the caller&apos;s name,
              number and what they need, and puts real emergencies straight through to their mobile.
            </p>
            <Receptionist
              numbers={rxNumbers || []}
              calls={rxCalls}
              available={rxAvailable}
              /* The plan is a good first guess so the right panel paints
                 immediately; the server's answer replaces it once loaded,
                 and the route is what actually enforces this either way. */
              canUse={rxCanUse === null ? canUseReceptionist(profile?.plan) : rxCanUse}
              busy={rxBusy}
              error={rxError}
              onSearch={searchNumbers}
              onBuy={buyReceptionistNumber}
              onSave={saveReceptionist}
              onDelete={deleteReceptionistNumber}
              /* Billing, not Invoices — Invoices is a list of receipts,
                 and a button called "See plans" that shows receipts is a
                 dead end dressed as a way forward. */
              onUpgrade={() => setTab("billing")}
            />
          </div>
        )}

        {/* ===== BILLING TAB ===== */}
        {tab === "invoices" && (
          <div style={{ padding: "48px 40px", maxWidth: 640, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Invoices</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
              Bill a client directly — they get an emailed summary of charges. This doesn't collect payment; you
              still arrange that with them yourself.
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 32,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>CLIENT NAME</span>
                  <input
                    value={invoiceClientName}
                    onChange={(e) => setInvoiceClientName(e.target.value)}
                    placeholder="Business or contact name"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: "#fff",
                      fontFamily: body,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>CLIENT EMAIL</span>
                  <input
                    value={invoiceClientEmail}
                    onChange={(e) => setInvoiceClientEmail(e.target.value)}
                    placeholder="client@business.com"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: "#fff",
                      fontFamily: body,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>AMOUNT ($)</span>
                  <input
                    value={invoiceAmount}
                    onChange={(e) => setInvoiceAmount(e.target.value)}
                    placeholder="500"
                    type="number"
                    min="0"
                    step="0.01"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: "#fff",
                      fontFamily: body,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>DESCRIPTION (OPTIONAL)</span>
                  <input
                    value={invoiceDescription}
                    onChange={(e) => setInvoiceDescription(e.target.value)}
                    placeholder="Website build — August"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: "11px 14px",
                      color: "#fff",
                      fontFamily: body,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                </label>
                {projects.length > 0 && (
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", letterSpacing: "0.04em" }}>LINKED SITE (OPTIONAL)</span>
                    <select
                      value={invoiceProjectId}
                      onChange={(e) => setInvoiceProjectId(e.target.value)}
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 10,
                        padding: "11px 14px",
                        color: "#fff",
                        fontFamily: body,
                        fontSize: 14,
                        outline: "none",
                      }}
                    >
                      <option value="">None</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>{p.client_name}</option>
                      ))}
                    </select>
                  </label>
                )}
                {invoiceError && (
                  <div style={{ fontSize: 13, color: "#F87171" }}>{invoiceError}</div>
                )}
                {invoiceSuccess && (
                  <div style={{ fontSize: 13, color: "#4ADE80" }}>{invoiceSuccess}</div>
                )}
                <button
                  onClick={sendInvoice}
                  disabled={invoiceBusy}
                  style={{
                    background: invoiceBusy ? "rgba(255,255,255,0.08)" : accent,
                    color: invoiceBusy ? "rgba(255,255,255,0.4)" : "#0A0A10",
                    border: "none",
                    borderRadius: 10,
                    padding: "11px 18px",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: invoiceBusy ? "default" : "pointer",
                  }}
                >
                  {invoiceBusy ? "Sending…" : "Send invoice"}
                </button>
              </div>
            </div>

            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Sent invoices</div>
            {invoicesLoading && (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Loading…</div>
            )}
            {!invoicesLoading && invoices.length === 0 && (
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>No invoices sent yet.</div>
            )}
            {!invoicesLoading && invoices.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {invoices.map((inv) => (
                  <div
                    key={inv.id}
                    style={{
                      borderRadius: 12,
                      padding: "14px 16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{inv.client_name}</div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)" }}>
                        {inv.invoice_number} · {inv.client_email} ·{" "}
                        {new Date(inv.created_at).toLocaleDateString()}
                      </div>
                      {inv.description && (
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                          {inv.description}
                        </div>
                      )}
                    </div>
                    <div style={{ fontFamily: display, fontWeight: 700, fontSize: 16, whiteSpace: "nowrap" }}>
                      ${(inv.amount_cents / 100).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "billing" && (
          <div style={{ padding: "48px 40px", maxWidth: 640, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Billing</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
              Your current plan and usage for this billing cycle.
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 4 }}>Current plan</div>
                  <div style={{ fontFamily: display, fontWeight: 700, fontSize: 20 }}>{limits.label}</div>
                </div>
                <a
                  href="/pricing"
                  style={{
                    background: accent,
                    color: "#0A0A10",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "10px 18px",
                    borderRadius: 10,
                    textDecoration: "none",
                  }}
                >
                  {currentPlan === "none" || currentPlan === "trial" ? "Choose a plan" : "Change plan"}
                </a>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Client sites</span>
                  <span>{sitesUsed} / {limits.sites}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${limits.sites ? Math.min(100, (sitesUsed / limits.sites) * 100) : 0}%`,
                      height: "100%",
                      background: accent,
                    }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Generations this month</span>
                  <span>{gensUsed} / {limits.generations}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${limits.generations ? Math.min(100, (gensUsed / limits.generations) * 100) : 0}%`,
                      height: "100%",
                      background: accent,
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.5)" }}>Lead searches this month</span>
                  <span>{searchesUsedBilling} / {limits.searches}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${limits.searches ? Math.min(100, (searchesUsedBilling / limits.searches) * 100) : 0}%`,
                      height: "100%",
                      background: accent,
                    }}
                  />
                </div>
              </div>
            </div>

            {billingStatus?.cancelAtPeriodEnd && (
              <div
                style={{
                  fontSize: 13,
                  color: "#FCD34D",
                  background: "rgba(217,119,6,0.1)",
                  border: "1px solid rgba(217,119,6,0.25)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 16,
                }}
              >
                Your subscription is set to cancel on{" "}
                {billingStatus.currentPeriodEnd
                  ? new Date(billingStatus.currentPeriodEnd * 1000).toLocaleDateString()
                  : "the end of this billing period"}
                . You'll keep full access until then.
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
              <button
                onClick={async () => {
                  const res = await fetch("/api/billing-portal", { method: "POST" });
                  const result = await res.json();
                  if (result.url) {
                    window.location.href = result.url;
                  } else {
                    alert(result.error || "Couldn't open billing portal.");
                  }
                }}
                disabled={currentPlan === "none" || currentPlan === "trial"}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#F2F0FA",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: currentPlan === "none" || currentPlan === "trial" ? "default" : "pointer",
                  opacity: currentPlan === "none" || currentPlan === "trial" ? 0.4 : 1,
                }}
              >
                Manage billing
              </button>

              {currentPlan !== "none" && billingStatus?.hasSubscription && (
                billingStatus.cancelAtPeriodEnd ? (
                  <button
                    onClick={async () => {
                      setCancelBusy(true);
                      const res = await fetch("/api/resume-subscription", { method: "POST" });
                      if (res.ok) {
                        await loadBillingStatus();
                      } else {
                        const result = await res.json();
                        alert(result.error || "Couldn't resume subscription.");
                      }
                      setCancelBusy(false);
                    }}
                    disabled={cancelBusy}
                    style={{
                      background: accent,
                      color: "#0A0A10",
                      border: "none",
                      borderRadius: 10,
                      padding: "10px 18px",
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: cancelBusy ? "default" : "pointer",
                    }}
                  >
                    {cancelBusy ? "Resuming…" : "Resume subscription"}
                  </button>
                ) : (
                  <button
                    onClick={async () => {
                      const confirmed = window.confirm(
                        "Cancel your subscription? You'll keep access until the end of your current billing period, then your plan will end."
                      );
                      if (!confirmed) return;
                      setCancelBusy(true);
                      const res = await fetch("/api/cancel-subscription", { method: "POST" });
                      if (res.ok) {
                        await loadBillingStatus();
                      } else {
                        const result = await res.json();
                        alert(result.error || "Couldn't cancel subscription.");
                      }
                      setCancelBusy(false);
                    }}
                    disabled={cancelBusy}
                    style={{
                      background: "rgba(239,68,68,0.1)",
                      color: "#F87171",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 10,
                      padding: "10px 18px",
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: cancelBusy ? "default" : "pointer",
                    }}
                  >
                    {cancelBusy ? "Cancelling…" : "Cancel subscription"}
                  </button>
                )
              )}
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
              Generation usage resets at the start of each billing cycle. Use "Manage billing" to update your card or
              view invoices, or use "Cancel subscription" to cancel directly — no need to leave the dashboard.
            </div>

          </div>
        )}

        {/* ===== REFERRALS TAB ===== */}
        {tab === "referrals" && (
          <div style={{ padding: "48px 40px", maxWidth: 640, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Referrals</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32, lineHeight: 1.6 }}>
              Share your link. When someone signs up through it and subscribes to a paid plan — not just
              makes a free trial account — you get $5 off your next invoice automatically.
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Your referral link</div>
              {referralStats?.referralCode ? (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://sitebric.com/?ref=${referralStats.referralCode}`);
                    setReferralCopied(true);
                    setTimeout(() => setReferralCopied(false), 2000);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    color: "#F2F0FA",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                    fontSize: 13,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ wordBreak: "break-all" }}>{`sitebric.com/?ref=${referralStats.referralCode}`}</span>
                  <span
                    style={{
                      flexShrink: 0,
                      fontFamily: display,
                      fontWeight: 700,
                      fontSize: 12,
                      color: referralCopied ? "#4FD9C0" : "rgba(255,255,255,0.6)",
                    }}
                  >
                    {referralCopied ? "Copied" : "Copy"}
                  </span>
                </button>
              ) : (
                <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>Loading your link…</div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginBottom: 20 }}>
              {[
                ["Signed up", referralStats?.totalSignups ?? "—"],
                ["Became paying", referralStats?.activated ?? "—"],
                ["You've earned", referralStats ? `$${(referralStats.rewardCents / 100).toFixed(2)}` : "—"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    borderRadius: 14,
                    padding: 18,
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>{label}</div>
                  <div style={{ fontFamily: display, fontWeight: 700, fontSize: 22 }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", lineHeight: 1.6 }}>
              "Became paying" means they actually subscribed to a plan — a free trial signup doesn't count,
              so you're only ever rewarded once real revenue is behind it. The $5 shows up as a credit on
              your account and comes off your next Stripe invoice automatically.
            </div>
          </div>
        )}

        {/* ===== PROFILE TAB ===== */}
        {tab === "profile" && (
          <div style={{ padding: "48px 40px", maxWidth: 640, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Profile</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
              Your account details.
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 16,
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: display,
                  fontWeight: 700,
                  fontSize: 18,
                  color: "#0A0A10",
                  flexShrink: 0,
                }}
              >
                {user?.email ? user.email.slice(0, 1).toUpperCase() : "?"}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{user?.email || "Loading..."}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
                  Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                </div>
              </div>
            </div>

            <button
              onClick={signOut}
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F2F0FA",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: "10px 18px",
                fontFamily: display,
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </div>
        )}

        {/* ===== SETTINGS TAB ===== */}
        {tab === "settings" && (
          <div style={{ padding: "48px 40px", maxWidth: 640, overflowY: "auto" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 26, marginBottom: 6 }}>Settings</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginBottom: 32 }}>
              Account preferences.
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Email</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
                {user?.email || "—"}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                To change your login email, sign in with a different address next time — a new account isn't created if you've used it before.
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                marginBottom: 20,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Need help?</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>
                Questions, bugs, or feedback — reach out anytime at{" "}
                <a href="mailto:supportsitebric@gmail.com" style={{ color: "#FFFFFF" }}>
                  supportsitebric@gmail.com
                </a>
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 24,
                background: "rgba(239,68,68,0.05)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: "#F87171" }}>Danger zone</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginBottom: 16 }}>
                Deleting your account removes all client sites permanently. This can't be undone.
              </div>
              {!deleteArmed ? (
                <button
                  onClick={() => { setDeleteArmed(true); setDeleteError(""); }}
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#F87171",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 10,
                    padding: "10px 18px",
                    fontFamily: display,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  Delete account
                </button>
              ) : (
                <div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", marginBottom: 10 }}>
                    Type <span style={{ color: "#F87171", fontWeight: 600 }}>DELETE</span> to confirm. This
                    cancels your subscription and erases every site.
                  </div>
                  <input
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                    placeholder="DELETE"
                    aria-label="Type DELETE to confirm account deletion"
                    style={{
                      width: "100%",
                      maxWidth: 260,
                      boxSizing: "border-box",
                      height: 42,
                      padding: "0 14px",
                      marginBottom: 12,
                      borderRadius: 10,
                      border: "1px solid rgba(239,68,68,0.3)",
                      background: "rgba(0,0,0,0.4)",
                      color: t.text,
                      fontFamily: body,
                      fontSize: 14,
                      outline: "none",
                    }}
                  />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteText.trim().toUpperCase() !== "DELETE" || deleteBusy}
                      style={{
                        background: "rgba(239,68,68,0.16)",
                        color: "#F87171",
                        border: "1px solid rgba(239,68,68,0.4)",
                        borderRadius: 10,
                        padding: "10px 18px",
                        fontFamily: display,
                        fontWeight: 700,
                        fontSize: 13,
                        cursor:
                          deleteText.trim().toUpperCase() === "DELETE" && !deleteBusy ? "pointer" : "not-allowed",
                        opacity: deleteText.trim().toUpperCase() === "DELETE" && !deleteBusy ? 1 : 0.5,
                      }}
                    >
                      {deleteBusy ? "Deleting…" : "Permanently delete"}
                    </button>
                    <button
                      onClick={() => { setDeleteArmed(false); setDeleteText(""); setDeleteError(""); }}
                      disabled={deleteBusy}
                      style={{
                        background: "transparent",
                        color: "rgba(255,255,255,0.6)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        borderRadius: 10,
                        padding: "10px 18px",
                        fontFamily: display,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: deleteBusy ? "not-allowed" : "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                  {deleteError && (
                    <div style={{ marginTop: 12, fontSize: 13, color: "#F87171" }}>{deleteError}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
