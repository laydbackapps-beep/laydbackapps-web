# BRAND LOCK — HIGHEST PRIORITY, DO NOT VIOLATE

1. BEFORE designing anything, perform a brand audit of the existing socials:
   @hairbyaloraa, @aurahaircollective_ and @alorapalmer_ on Instagram.
   Extract and document: logo files/variants, exact typography, colour palette.
2. The logo, fonts, and palette from the brand audit are FIXED. Do not select
   new fonts, do not redraw or restyle the logo, do not introduce new brand
   colours. All design work must build AROUND these assets.
3. Typography hierarchy must be built using the audit's identified fonts and
   weights only. If an exact web-licensed version of a font cannot be sourced,
   propose the closest match (Google Fonts/Adobe Fonts) and list the match for
   client approval BEFORE using it — never silently substitute.
4. The two sites share the same brand system (sister brands): identical fonts
   and logo treatment, differentiated only by accent colour usage and layout
   personality (Aura = warm/sanctuary, Alora = editorial/craft).
5. If any asset is ambiguous or missing (e.g., low-res logo), STOP and flag it
   as a question rather than recreating it.

---

# LOCK STATUS — DECLARED FALLBACKS AUTHORISED

**Status: `locked_with_declared_fallbacks`.**

On 14 November 2026 the user said the original logo masters, Canva brand kit,
exact font names and licences could not be obtained, and directed the build to
make do and improvise. This authorises the specific fallbacks below — not new
fonts, colours, or logo variants.

**These are fallbacks, not original brand fonts or masters. Never describe them
as originals.**

## Fixed versus fallback

| Element | Rule |
|---|---|
| Logo pixels | Use the supplied Instagram rasters only. No redrawing, retyping, recolouring, or new light/dark variants. |
| Site display font | **Italiana 400**, Google Fonts — closest shared high-contrast display fallback. |
| Body / descriptor font | **Montserrat 400 / 500 / 600**, Google Fonts — closest tracked geometric-sans fallback. |
| Sister-brand system | Both sites use the same site typography and palette. The actual logo lockups remain different. |
| Alora personality | Editorial / craft. |
| Aura personality | Warm / sanctuary. |

The previous Cormorant Garamond + Inter Tight choices were unapproved and have
been removed. Do not restore them or introduce any other typeface without a new
instruction.

## Logo fallbacks

### Hair by Alora
- Source: `logos/alora_logo_reference_1164.jpg` (1164×1137 original Instagram tile).
- Light-surface use: original tile.
- Dark-surface use: `alora-mark.png`, a transparent mask of the same pixels in
  the original blush `#DEC1A9`.
- The undocumented `alora-wordmark-*.webp` light/dark variants were removed.
- No emblem, horizontal lockup, or new colour variant may be invented.

### Aura Hair Collective
- Source: clean Instagram roundel capture and the original dimensional wall-sign
  photograph.
- Small branding: `aura-roundel.png`, circular crop only. Do not enlarge into a
  hero or print asset; the source is limited.
- Gold treatment: use the wall-sign photograph as environmental imagery, not as
  a flat digital logo.
- No flat vector emblem or new light/dark variant may be invented.

The marks are not the same typeface or lockup. Alora is script + contrast sans;
Aura is display serif + spaced sans. Sharing site typography is the declared
fallback for clause 4; it does not make the marks identical.

## Palette — LOCKED

Base colours sampled from the actual assets:

| Token | Hex | Use |
|---|---|---|
| Alora Mocha | `#75604D` | Alora primary field |
| Alora Blush | `#DEC1A9` | Alora mark / accents |
| Aura Mocha | `#7B5F4A` | Aura primary field |
| Aura Cream | `#FFFBEE` | Aura mark / surfaces |
| Signage Gold | `#8D6332` | Accent only; never body text |
| Salon Wall | `#B7B6B1` | Neutral surface reference |
| Honey Tone | `#B08C6E` | Photography only, not UI |
| Ash Tone | `#868282` | Photography only, not UI |

Derived tints already authorised in `brand-lock.json`:

`#211A15`, `#2A2018`, `#2B2018`, `#2E2117`, `#34261B`, `#3B2D22`,
`#655044`, `#8D735F`, `#C5A675`, `#C8B5A2`, `#D6B98C`, `#D9CBBB`,
`#F0E4D6`, `#F0E5D7`, `#F2E8D9`.

New tints may only be mixed from the locked colours with Aura Cream, white or
black. No new hues. Success/error functional colours are listed separately in
`brand-lock.json`; third-party product and social-icon colours are not brand
colours.

## Usage rules

1. Use the original raster pixels. Do not retype, trace, redraw, recolour, add
   effects, or fabricate a vector.
2. Clear space: at least the cap height of the `A` on all sides.
3. Alora's header mark should render large enough to read; use the full name in
   alt text. Aura's roundel is small-format only.
4. Only supplied raster variants may be used. No black/white/reversed variants.
5. Do not place either mark over busy hair photography without a clear-space or
   containment treatment.
6. Gold is an accent. It is not body copy on light backgrounds and not a
   substitute for Aura's cream wordmark.
7. The personal account is not a design reference: @alorapalmer_ is private;
   only its bio and avatar were visible.
8. No public Facebook page for either Carey Bay business was found. Do not use
   an unrelated salon as a source.

## Enforcement

Run before any build or deployment:

```bash
python3 /home/oem/laydback-sales-system/clients/alora-brand/check_brand.py
```

The guard fails on unapproved fonts or colours. It warns that original logo
masters remain unavailable. Use `--report` for a non-blocking report.

Canonical audit: `BRAND_AUDIT.md`
One-page sheet: `brand-sheet.html` / `brand-sheet.pdf`
Structured tokens: `brand-lock.json`
