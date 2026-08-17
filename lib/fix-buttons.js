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

// Guarantees the contact form reaches the dashboard.
//
// Appended rather than rewritten: parsing and re-authoring someone else's
// form markup is far more fragile than binding a submit handler to
// whatever is actually on the page. A form the model wired correctly
// already calls preventDefault and is skipped.
export function withLeadFormFallback(code, projectId) {
  if (!code || !projectId) return code;

  const script = `
<script>
(function () {
  var ENDPOINT = 'https://sitebric.com/api/site-lead';
  var PROJECT_ID = ${JSON.stringify(projectId)};

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

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (!form || form.tagName !== 'FORM') return;
    // Already handled by the page's own code.
    if (e.defaultPrevented || form.dataset.sitebricSent) return;

    e.preventDefault();
    form.dataset.sitebricSent = '1';

    var name = valueOf(form, ['name']) || firstFilled(form, 'input[type="text"]');
    var contact =
      valueOf(form, ['email', 'phone', 'tel', 'mobile', 'number']) ||
      firstFilled(form, 'input[type="email"]') ||
      firstFilled(form, 'input[type="tel"]');
    var message = valueOf(form, ['message', 'detail', 'need', 'help', 'comment', 'describe']) || firstFilled(form, 'textarea');

    var btn = form.querySelector('[type="submit"], button');
    var label = btn ? (btn.textContent || btn.value) : '';
    if (btn) {
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
        var done = document.createElement('div');
        done.textContent = "Thanks — we'll be in touch soon.";
        done.style.cssText = 'padding:18px 0;font-weight:600;';
        form.parentNode.replaceChild(done, form);
      })
      .catch(function () {
        // The visitor's typing is left intact so they can try again.
        form.dataset.sitebricSent = '';
        if (btn) {
          btn.disabled = false;
          if (btn.tagName === 'BUTTON') btn.textContent = label;
        }
        var err = form.querySelector('.sitebric-error');
        if (!err) {
          err = document.createElement('div');
          err.className = 'sitebric-error';
          err.style.cssText = 'color:#b91c1c;padding-top:10px;font-size:14px;';
          form.appendChild(err);
        }
        err.textContent = "Couldn't send that just now — please try again, or call us.";
      });
  });
})();
</script>`;

  const idx = code.toLowerCase().lastIndexOf("</body>");
  if (idx === -1) return code + script;
  return code.slice(0, idx) + script + code.slice(idx);
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
