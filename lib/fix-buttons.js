// Every button on a generated site has to do something.
//
// An audit of every site generated so far found two failures, both of
// which look completely fine on screen:
//
//   href="#" on a call-to-action — 22 of 31 sites. The button is styled,
//   it hovers, it is obviously the thing to click, and it goes nowhere.
//   One site had fourteen of them.
//
//   A contact form not wired to /api/site-lead — 12 of 31 sites, one of
//   them published and live. The visitor fills it in, presses send, and
//   the enquiry is lost. That is worse than having no form: the business
//   believes nobody is getting in touch.
//
// The generation prompt asks for both of these correctly and mostly gets
// them, but "mostly" is not a standard to hand a paying client, so this
// enforces them after the fact — the same reasoning as the fabricated
// phone number guard.

// Points dead call-to-action links at the contact section, which is where
// they were always meant to go.
export function fixDeadLinks(code, { hasContact }) {
  if (!code) return { code, changed: 0 };
  let changed = 0;

  const fixed = String(code).replace(
    /<a\b([^>]*?)href=(["'])(#|javascript:void\(0\);?|)\2([^>]*)>/gi,
    (match, before, quote, _href, after) => {
      changed++;
      // Without a contact section there is nowhere better to send them, so
      // the link is made inert rather than left pretending to work: no
      // href at all means no pointer cursor and no false affordance.
      if (!hasContact) return `<a${before}${after}>`;
      return `<a${before}href=${quote}#contact${quote}${after}>`;
    }
  );

  return { code: fixed, changed };
}

// Markers so an older guard can be found and replaced rather than
// stacked on top of. Without this, re-running the repair would append a
// second copy and every enquiry would arrive twice.
const GUARD_OPEN = "<!--sitebric-lead-guard-->";
const GUARD_CLOSE = "<!--/sitebric-lead-guard-->";
const GUARD_RE = /<!--sitebric-lead-guard-->[\s\S]*?<!--\/sitebric-lead-guard-->/gi;

// The first shipped guard predates the markers. It is recognised by its
// opening lines, which nothing a model writes looks like, and by the
// `})();` that closes the IIFE — a sequence that appears exactly once
// inside it.
const LEGACY_GUARD_RE =
  /<script>\s*\(function \(\) \{\s*var ENDPOINT = 'https:\/\/sitebric\.com\/api\/site-lead';[\s\S]*?\}\)\(\);\s*<\/script>/gi;

export function stripLeadFormGuard(code) {
  if (!code) return code;
  return String(code).replace(GUARD_RE, "").replace(LEGACY_GUARD_RE, "");
}

// Guarantees the contact form reaches the dashboard.
//
// Appended rather than rewritten: parsing and re-authoring someone else's
// form markup is far more fragile than binding a submit handler to
// whatever is actually on the page.
//
// The hard case is a form the model wired to *look* finished. Three sites
// — one of them published and live — shipped a handler that called
// preventDefault, hid the form, showed "We'll call you shortly", and sent
// the enquiry precisely nowhere. The first version of this guard skipped
// any form whose event was already defaultPrevented, on the assumption
// that meant the page had it in hand, so those forms stayed silently
// broken. A visitor is told they got through and nobody is ever called:
// worse than no form at all.
//
// So the page only gets to own submission when it demonstrably posts to
// the lead endpoint. That is decided here, at build time, by reading the
// page's own code — and when it doesn't, the guard listens in the capture
// phase so it reads the field values before any handler can reset them.
export function withLeadFormFallback(code, projectId) {
  if (!code || !projectId) return code;

  // Any previous guard is removed first, so this is idempotent and so the
  // check below sees only the page's own code.
  const base = stripLeadFormGuard(code);
  const pagePostsLeads = /\/api\/site-lead/i.test(base);

  const script = `${GUARD_OPEN}
<script>
(function () {
  var ENDPOINT = 'https://sitebric.com/api/site-lead';
  var PROJECT_ID = ${JSON.stringify(projectId)};
  // True when the page posts enquiries itself. Then this only stands by,
  // and must not fire, or every lead would arrive twice.
  var PAGE_POSTS = ${pagePostsLeads ? "true" : "false"};

  function valueOf(form, patterns) {
    var fields = form.querySelectorAll('input, textarea, select');
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (f.type === 'submit' || f.type === 'button' || f.type === 'hidden') continue;
      var hay = ((f.name || '') + ' ' + (f.id || '') + ' ' + (f.placeholder || '') + ' ' + (f.getAttribute('aria-label') || '')).toLowerCase();
      for (var p = 0; p < patterns.length; p++) {
        if (hay.indexOf(patterns[p]) !== -1 && f.value) return f.value;
      }
    }
    return '';
  }

  function firstFilled(form, type) {
    var fields = form.querySelectorAll(type);
    for (var i = 0; i < fields.length; i++) if (fields[i].value) return fields[i].value;
    return '';
  }

  function onSubmit(e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    if (form.dataset.sitebricSent) return;
    // Only when the page genuinely posts the enquiry itself does
    // preventDefault mean "handled" — otherwise it means the visitor is
    // about to be shown a thank-you for a message nobody will receive.
    if (PAGE_POSTS && e.defaultPrevented) return;

    e.preventDefault();
    form.dataset.sitebricSent = '1';

    // The page keeps whatever success message it wrote; this only takes
    // over the visible response when the form has no handler of its own.
    var pageOwnsUi = !PAGE_POSTS && !!form.getAttribute('onsubmit');

    var name = valueOf(form, ['name']) || firstFilled(form, 'input[type="text"]');
    var contact =
      valueOf(form, ['email', 'phone', 'tel', 'mobile', 'number']) ||
      firstFilled(form, 'input[type="email"]') ||
      firstFilled(form, 'input[type="tel"]');
    var message = valueOf(form, ['message', 'detail', 'need', 'help', 'comment', 'describe']) || firstFilled(form, 'textarea');

    var btn = form.querySelector('[type="submit"], button');
    var label = btn ? (btn.textContent || btn.value) : '';
    if (btn && !pageOwnsUi) {
      btn.disabled = true;
      if (btn.tagName === 'BUTTON') btn.textContent = 'Sending…';
    }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: PROJECT_ID, name: name, contact: contact, message: message })
    })
      .then(function (r) {
        if (!r.ok) throw new Error('failed');
        if (pageOwnsUi || !form.parentNode) return;
        var done = document.createElement('div');
        done.textContent = "Thanks — we'll be in touch soon.";
        done.style.cssText = 'padding:18px 0;font-weight:600;';
        form.parentNode.replaceChild(done, form);
      })
      .catch(function () {
        // The visitor's typing is left intact so they can try again.
        form.dataset.sitebricSent = '';
        if (btn && !pageOwnsUi) {
          btn.disabled = false;
          if (btn.tagName === 'BUTTON') btn.textContent = label;
        }
        // Shown even when the page has already claimed success, because
        // the alternative is letting a visitor walk away believing the
        // business heard from them.
        form.style.display = '';
        var err = form.querySelector('.sitebric-error');
        if (!err) {
          err = document.createElement('div');
          err.className = 'sitebric-error';
          err.style.cssText = 'color:#b91c1c;padding-top:10px;font-size:14px;';
          form.appendChild(err);
        }
        err.textContent = "Couldn't send that just now — please try again, or call us.";
      });
  }

  // Capture phase when the page does not post enquiries itself, so the
  // values are read before a handler of its own can reset the form —
  // which is exactly what the sites this was written for do.
  document.addEventListener('submit', onSubmit, !PAGE_POSTS);
})();
</script>
${GUARD_CLOSE}`;

  const idx = base.toLowerCase().lastIndexOf("</body>");
  if (idx === -1) return base + script;
  return base.slice(0, idx) + script + base.slice(idx);
}

// One call for the whole guard, so both generation paths apply exactly the
// same rules and cannot drift.
export function makeButtonsWork(code, projectId) {
  const hasContact = /id=["']contact["']/i.test(code || "");
  const links = fixDeadLinks(code, { hasContact });
  return {
    code: withLeadFormFallback(links.code, projectId),
    deadLinksFixed: links.changed,
  };
}
