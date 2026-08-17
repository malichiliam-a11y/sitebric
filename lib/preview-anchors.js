// In-page links do not work inside the dashboard preview.
//
// The preview is a srcdoc iframe, and a srcdoc document inherits its base
// URL from the page around it. So an href="#contact" on a "Get a Quote"
// button resolves against /dashboard rather than against the site itself:
// the browser treats it as a different document and navigates the frame
// away instead of scrolling to the contact section. Every anchor CTA on
// every single-page site is dead in the preview because of this.
//
// It is only ever wrong in the preview. A published site is served from
// its own URL, where the same markup scrolls correctly — which is why
// this belongs here, applied as the preview renders, rather than being
// baked into the generated file. Applying it here also means it fixes
// every site already generated, with nothing to regenerate.
const SCRIPT = `
<script>
(function () {
  // Multi-page sites ship their own router, which already intercepts
  // these clicks and switches pages. Two handlers would fight.
  if (document.querySelector('.page')) return;

  document.addEventListener('click', function (e) {
    if (!e.target.closest) return;
    var link = e.target.closest('a[href]');
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.charAt(0) !== '#') return;

    e.preventDefault();
    var id = href.slice(1);
    if (!id) return;

    var el = null;
    try { el = document.getElementById(id); } catch (err) {}
    if (!el) el = document.querySelector('[name="' + id + '"]');
    if (!el) return;

    if (el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
})();
</script>`;

export function withPreviewAnchorFix(code) {
  if (!code) return code;
  // Before </body> so the document is parsed by the time it runs; falls
  // back to appending for markup that never closes the tag.
  const idx = code.toLowerCase().lastIndexOf("</body>");
  if (idx === -1) return code + SCRIPT;
  return code.slice(0, idx) + SCRIPT + code.slice(idx);
}
