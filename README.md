# V Do Marketing — Authority UI Template

This is a starter static site scaffold implementing a high-conversion "Authority UI" suitable for V Do Marketing. It mirrors the structural and visual patterns described in the design brief (hero audit bar, key takeaways, author bios, blog grid, exit-intent modal, high-contrast footer, mobile sticky audit bar).

Files added:
- `index.html` — Home page with audit bar, social proof, services grid.
- `css/styles.css` — Design tokens, layout, responsive rules, and high-contrast support.
- `js/main.js` — Small interactive behaviors (hamburger, exit intent, cookie banner, audit form redirect, language toggle).
- `services/service-template.html` — Service landing template with Key Takeaways and Author Bio.
- `blog/blog-template.html` — Blog listing template with category filters, badges, and reading times.
- `tools/audit-result.html` — Placeholder audit results page used by the audit form.
- `assets/*` — SVG placeholders for logos, headshots, and thumbnails.

How to view locally:
1. Open `index.html` in your browser. On macOS you can double-click the file or run:

```bash
open index.html
```

Next steps / suggestions:
- Replace placeholder assets with brand photography and logos.
- Integrate an actual audit backend for `tools/audit-result.html` and secure the form.
- Implement CMS or static-site generator (e.g., Eleventy, Next.js) if you want programmatic blog/service pages and metadata for reading times.
- Add analytics, proper cookie consent flows, and A/B testing for CTAs.
# pidimarketing
