#!/usr/bin/env python3
"""Build the A Cut Above one-pager. No client work photos exist (page publishes only a
promo graphic + banner), so the site uses the client's own badge + banner artwork only."""
import os, re
SITE = "/home/ogheesus/laydback-site/sites/a-cut-above-lawn-garden"
A = os.path.join(SITE, "assets")

def inline(svg):
    s = svg.strip()
    s = re.sub(r'(<svg\b[^>]*?)\s+width="[^"]*"', r'\1', s, count=1)
    s = re.sub(r'(<svg\b[^>]*?)\s+height="[^"]*"', r'\1', s, count=1)
    return s

BRANDW = inline(open(os.path.join(A, "logo-word.svg")).read()).replace(
    'role="img" aria-label="A Cut Above — Lawn &amp; Garden Maintenance"', 'class="brand__word" aria-hidden="true"')

PHONE = "0432 600 356"
TEL = "tel:0432600356"
FB = "https://www.facebook.com/people/A-Cut-Above-the-Best-Lawn-Garden-Maintenance/61596072501384/"
YEAR = "2026"

SERVICES = [
    ("Lawn mowing", "Regular mowing for small to large lawns, with edges included, kept to a schedule that suits the block."),
    ("Hedge trimming", "Hedges and bushes cut back and shaped for a tidy line, then cleaned up behind."),
    ("Planting & mulching", "New plants put in and garden beds mulched to hold moisture and keep the weeds down."),
    ("Garden maintenance", "Weeding, pruning and general upkeep so beds and borders stay in order between visits."),
    ("Garden clean ups", "One-off tidy-ups for overgrown yards, including green waste removed from site."),
    ("Pressure washing", "Driveways, paths and paved areas cleaned back to a fresh, even finish."),
]

PROCESS = [
    ("Send your details", "Text the address and a few photos of the yard to 0432 600 356."),
    ("Get a free quote", "A price comes back for the job — no obligation."),
    ("The work", "Mowing, trimming, planting, mulching and cleaning up, with green waste taken away."),
    ("Keep it going", "Book it in as a regular visit or a one-off clean-up, whichever suits."),
]

AREAS = ["Newcastle", "Lake Macquarie", "Maitland", "Cessnock", "Hunter Valley", "Surrounding areas"]

FAQ = [
    ("What areas do you cover?", "Newcastle, Lake Macquarie, Maitland, Cessnock, the Hunter Valley and all surrounding areas."),
    ("Do you do homes and businesses?", "Yes — both residential and commercial properties."),
    ("How do I get a quote?", "Text details including pictures to 0432 600 356 and a free quote comes back to you."),
    ("Are you insured?", "Yes — the business is fully insured."),
    ("What work do you take on?", "Lawn mowing, hedge trimming, planting and mulching, garden maintenance, garden clean ups, green waste removal and pressure washing."),
    ("Are you taking on new clients?", "Yes — new clients are welcome across the Hunter Valley."),
]

services_html = "\n".join(
    f'''        <article class="svc">
          <span class="svc__n">{i:02d}</span>
          <h3>{t}</h3>
          <p>{d}</p>
        </article>''' for i, (t, d) in enumerate(SERVICES, 1))

process_html = "\n".join(
    f'''          <li><span class="step__n">{i:02d}</span><div><h3>{t}</h3><p>{d}</p></div></li>'''
    for i, (t, d) in enumerate(PROCESS, 1))

faq_html = "\n".join(
    f'''        <details class="faq__item"><summary>{q}</summary><p>{a}</p></details>'''
    for q, a in FAQ)

areas_html = "\n".join(f'          <li>{a}</li>' for a in AREAS)

HTML = f'''<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>A Cut Above — Lawn &amp; Garden Maintenance in Maitland &amp; the Hunter</title>
<meta name="description" content="A Cut Above the Best Lawn &amp; Garden Maintenance — mowing, hedge trimming, planting, mulching, clean ups and pressure washing for homes and businesses across Maitland, Newcastle, Lake Macquarie, Cessnock and the Hunter Valley. Free quotes.">
<link rel="icon" href="assets/favicon.png" type="image/png">
<meta property="og:title" content="A Cut Above — Lawn &amp; Garden Maintenance, Maitland &amp; the Hunter">
<meta property="og:description" content="Residential &amp; commercial lawn and garden maintenance across Maitland, Newcastle, Lake Macquarie, Cessnock and the Hunter Valley. Free quotes — text 0432 600 356.">
<meta property="og:type" content="website">
<meta property="og:image" content="assets/logo-round.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {{
    --paper: #f6f7f2;
    --card: #ffffff;
    --ink: #171717;
    --ink-2: #4b514a;
    --ink-3: #7d837b;
    --line: #e2e4dc;
    --line-2: #cfd3c8;
    --acc: #4f8f00;
    --acc-ink: #3c6f00;
    --lime: #b6e01a;
    --dark: #14170f;
    --wrap: 1180px;
    --r: 8px;
    --shadow: 0 1px 2px rgba(23,23,23,.05), 0 14px 34px -18px rgba(23,23,23,.28);
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: var(--paper); color: var(--ink);
    font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased; }}
  h1, h2, h3, .brand__word, .eyebrow, .btn, .chip, .svc__n, .step__n, .foot__name {{
    font-family: "Bricolage Grotesque", "Inter", system-ui, sans-serif; }}
  h1, h2, h3 {{ margin: 0; letter-spacing: -0.02em; line-height: 1.05; font-weight: 700; }}
  p {{ margin: 0; }}
  img {{ display: block; max-width: 100%; height: auto; }}
  .wrap {{ max-width: var(--wrap); margin: 0 auto; padding: 0 28px; }}
  .eyebrow {{ display: inline-flex; align-items: center; gap: 9px; font-weight: 600; font-size: 12.5px;
    letter-spacing: .14em; text-transform: uppercase; color: var(--acc-ink); }}
  .eyebrow::before {{ content: ""; width: 26px; height: 2px; background: var(--lime); display: inline-block; }}

  .nav {{ position: sticky; top: 0; z-index: 30; background: rgba(246,247,242,.9);
    backdrop-filter: saturate(1.4) blur(10px); border-bottom: 1px solid var(--line); }}
  .nav__in {{ display: flex; align-items: center; gap: 24px; height: 88px; }}
  .brand {{ display: inline-flex; align-items: center; gap: 12px; text-decoration: none; }}
  .brand__mark {{ height: 50px; width: 50px; flex: none; border-radius: 50%; }}
  .brand__word {{ height: 34px; width: 153px; flex: none; }}
  .nav__links {{ display: flex; gap: 24px; margin-left: auto; }}
  .nav__links a {{ text-decoration: none; font-size: 15px; font-weight: 500; color: var(--ink-2); padding: 6px 0; }}
  .nav__links a:hover {{ color: var(--ink); }}
  .btn {{ display: inline-flex; align-items: center; gap: 8px; text-decoration: none; cursor: pointer;
    font-weight: 600; font-size: 15px; border-radius: var(--r); padding: 12px 20px; border: 1.5px solid transparent;
    transition: transform .15s ease, background .15s ease, color .15s ease; }}
  .btn--solid {{ background: var(--dark); color: #fff; }}
  .btn--solid:hover {{ background: #000; transform: translateY(-1px); }}
  .btn--ghost {{ border-color: var(--line-2); color: var(--ink); }}
  .btn--ghost:hover {{ border-color: var(--ink); }}
  .btn--acc {{ background: var(--acc); color: #fff; }}
  .btn--acc:hover {{ background: var(--acc-ink); transform: translateY(-1px); }}
  .nav__cta {{ margin-left: 6px; padding: 11px 18px; }}

  .hero {{ position: relative; padding: 70px 0 80px; overflow: hidden; }}
  .hero::before {{ content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image: radial-gradient(rgba(23,23,23,.05) 1px, transparent 1.5px); background-size: 24px 24px;
    mask-image: linear-gradient(180deg, #000, transparent 76%); }}
  .hero__in {{ position: relative; z-index: 1; display: grid; grid-template-columns: 1.08fr .92fr; gap: 46px; align-items: center; }}
  .hero h1 {{ font-size: clamp(36px, 4.8vw, 60px); margin: 20px 0 18px; font-weight: 800; }}
  .hero p.lead {{ color: var(--ink-2); font-size: 18.5px; max-width: 34ch; }}
  .hero__cta {{ display: flex; gap: 12px; margin: 28px 0 30px; flex-wrap: wrap; }}
  .chips {{ display: flex; flex-wrap: wrap; gap: 9px; }}
  .chip {{ font-size: 13px; font-weight: 600; color: var(--ink-2); background: #fff; border: 1px solid var(--line);
    border-radius: 999px; padding: 7px 13px; }}
  .chip b {{ color: var(--acc-ink); font-weight: 700; }}

  .qcard {{ background: #fff; border: 1px solid var(--line); border-radius: 14px; padding: 30px 30px 28px;
    box-shadow: var(--shadow); max-width: 100%; margin-left: auto; }}
  .qcard__top {{ display: flex; align-items: center; gap: 14px; }}
  .qcard__top img {{ height: 58px; width: 58px; border-radius: 50%; border: 1px solid var(--line); flex: none; }}
  .qcard__top strong {{ font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 19px; display: block; letter-spacing: -0.01em; }}
  .qcard__top span {{ font-size: 13px; color: var(--ink-3); }}
  .qcard p.small {{ color: var(--ink-2); font-size: 15.5px; margin: 20px 0 6px; }}
  .qcard .phone {{ font-family: "Bricolage Grotesque", sans-serif; font-weight: 800; font-size: clamp(30px, 4vw, 40px);
    letter-spacing: -0.02em; text-decoration: none; color: var(--ink); display: block; margin: 4px 0 4px; }}
  .qcard .phone:hover {{ color: var(--acc-ink); }}
  .qcard .note {{ font-size: 13.5px; color: var(--ink-3); }}
  .qcard .btn {{ margin-top: 20px; width: 100%; justify-content: center; }}

  section {{ scroll-margin-top: 100px; }}
  .band {{ padding: 84px 0; }}
  .band--tint {{ background: #fff; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }}
  .head {{ max-width: 640px; margin-bottom: 42px; }}
  .head h2 {{ font-size: clamp(28px, 3.4vw, 40px); margin: 16px 0 12px; }}
  .head p {{ color: var(--ink-2); }}

  .svc-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }}
  .svc {{ background: var(--paper); border: 1px solid var(--line); border-radius: 12px; padding: 26px 24px 28px; }}
  .svc__n {{ display: inline-block; font-weight: 700; font-size: 13px; letter-spacing: .12em; color: var(--acc); margin-bottom: 14px; }}
  .svc h3 {{ font-size: 19px; margin-bottom: 9px; }}
  .svc p {{ color: var(--ink-2); font-size: 15.5px; }}

  .process {{ background: var(--dark); color: #edefe6; }}
  .process .eyebrow {{ color: var(--lime); }}
  .process h2 {{ color: #fff; }}
  .process .head p {{ color: #aab0a0; }}
  .steps {{ list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }}
  .steps li {{ border-top: 2px solid #33382a; padding-top: 18px; }}
  .step__n {{ display: block; font-weight: 700; font-size: 14px; color: var(--lime); letter-spacing: .1em; margin-bottom: 12px; }}
  .steps h3 {{ font-size: 17px; margin-bottom: 8px; color: #fff; }}
  .steps p {{ color: #aab0a0; font-size: 14.5px; }}

  .about-band img {{ width: 100%; max-width: 900px; margin: 0 auto; border-radius: 12px; border: 1px solid var(--line); display: block; }}
  .about-band .lead2 {{ max-width: 720px; margin: 0 auto 34px; text-align: center; color: var(--ink-2); }}

  .areas {{ background: #fff; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }}
  .areas__grid {{ display: grid; grid-template-columns: 1.1fr 1fr; gap: 46px; align-items: start; }}
  .areas__grid .area-list {{ margin-top: 6px; }}
  .area-list {{ list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 22px; }}
  .area-list li {{ font-family: "Bricolage Grotesque", sans-serif; font-weight: 600; font-size: 18px; padding: 12px 0;
    border-bottom: 1px solid var(--line); display: flex; align-items: center; gap: 10px; }}
  .area-list li::before {{ content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--lime); flex: none; }}

  .faq {{ max-width: 820px; }}
  .faq__item {{ border-bottom: 1px solid var(--line); }}
  .faq__item summary {{ list-style: none; cursor: pointer; padding: 20px 34px 20px 0; position: relative;
    font-family: "Bricolage Grotesque", sans-serif; font-weight: 600; font-size: 18px; }}
  .faq__item summary::-webkit-details-marker {{ display: none; }}
  .faq__item summary::after {{ content: "+"; position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
    color: var(--acc); font-weight: 700; font-size: 22px; }}
  .faq__item[open] summary::after {{ content: "–"; }}
  .faq__item p {{ color: var(--ink-2); padding: 0 34px 22px 0; margin-top: -6px; }}

  .contact {{ background: #fff; border-top: 1px solid var(--line); }}
  .contact__card {{ display: grid; grid-template-columns: 1.1fr .9fr; gap: 46px; align-items: center;
    border: 1px solid var(--line); border-radius: 16px; padding: 44px 46px; background: var(--paper); }}
  .contact h2 {{ font-size: clamp(28px, 3.4vw, 40px); margin: 16px 0 14px; }}
  .contact p {{ color: var(--ink-2); }}
  .contact__meta {{ display: grid; gap: 16px; margin-top: 26px; }}
  .contact__meta div {{ display: flex; gap: 12px; align-items: flex-start; }}
  .contact__meta .k {{ font-family: "Bricolage Grotesque", sans-serif; font-weight: 600; font-size: 12.5px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--ink-3); min-width: 104px; padding-top: 3px; }}
  .contact__meta .v {{ font-weight: 500; }}
  .contact__meta a {{ color: var(--acc-ink); text-decoration: none; border-bottom: 1.5px solid rgba(60,111,0,.3); }}
  .contact__cta {{ display: flex; flex-direction: column; gap: 14px; }}
  .contact__cta .btn {{ justify-content: center; font-size: 16px; padding: 15px 22px; }}
  .contact__cta small {{ color: var(--ink-3); text-align: center; }}

  footer {{ padding: 40px 0 52px; }}
  .foot {{ display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: space-between; }}
  .foot__brand {{ display: flex; align-items: center; gap: 13px; }}
  .foot__mark {{ height: 42px; width: 42px; border-radius: 50%; }}
  .foot__name {{ font-family: "Bricolage Grotesque", sans-serif; font-weight: 700; font-size: 16px; }}
  .foot__meta {{ color: var(--ink-3); font-size: 14px; text-align: right; }}
  .foot__rule {{ border-top: 1px solid var(--line); margin: 26px 0 22px; }}

  @media (max-width: 980px) {{
    .hero__in {{ grid-template-columns: 1fr; gap: 40px; }}
    .qcard {{ margin: 0 auto; }}
    .svc-grid {{ grid-template-columns: repeat(2, 1fr); }}
    .steps {{ grid-template-columns: repeat(2, 1fr); }}
    .areas__grid {{ grid-template-columns: 1fr; gap: 28px; }}
    .contact__card {{ grid-template-columns: 1fr; padding: 34px 28px; gap: 30px; }}
    .nav__links {{ display: none; }}
  }}
  @media (max-width: 560px) {{
    body {{ font-size: 16px; }}
    .wrap {{ padding: 0 20px; }}
    .band {{ padding: 62px 0; }}
    .svc-grid, .steps, .area-list {{ grid-template-columns: 1fr; }}
    .hero h1 {{ font-size: 33px; }}
    .brand__word {{ height: 27px; width: 120px; }}
    .brand__mark {{ height: 44px; width: 44px; }}
    .nav__cta {{ padding: 10px 14px; font-size: 14px; }}
    .foot__meta {{ text-align: left; }}
  }}
  @media (prefers-reduced-motion: reduce) {{ * {{ transition: none !important; }} }}
</style>
</head>
<body>
  <header class="nav">
    <div class="wrap nav__in">
      <a class="brand" href="#top" aria-label="A Cut Above the Best Lawn &amp; Garden Maintenance — home">
        <img class="brand__mark" src="assets/logo-round.png" width="720" height="720" alt="A Cut Above the Best Lawn &amp; Garden Maintenance logo">
        {BRANDW}
      </a>
      <nav class="nav__links" aria-label="Sections">
        <a href="#services">Services</a>
        <a href="#process">Process</a>
        <a href="#areas">Areas</a>
        <a href="#faq">FAQ</a>
      </nav>
      <a class="btn btn--acc nav__cta" href="{TEL}">Call {PHONE}</a>
    </div>
  </header>

  <main id="top">
    <section class="hero">
      <div class="wrap hero__in">
        <div>
          <span class="eyebrow">Lawn &amp; Garden Maintenance · Maitland &amp; the Hunter</span>
          <h1>Lawns mowed, hedges trimmed and gardens kept in order.</h1>
          <p class="lead">Mowing, trimming, planting, mulching, clean ups and pressure washing for homes and businesses across Maitland, Newcastle, Lake Macquarie, Cessnock and the Hunter Valley.</p>
          <div class="hero__cta">
            <a class="btn btn--acc" href="{TEL}">Call for a free quote</a>
            <a class="btn btn--ghost" href="#services">See services</a>
          </div>
          <div class="chips">
            <span class="chip"><b>Residential</b> &amp; commercial</span>
            <span class="chip">Fully insured</span>
            <span class="chip">Free quotes</span>
            <span class="chip">Green waste removed</span>
          </div>
        </div>
        <div class="qcard">
          <div class="qcard__top">
            <img src="assets/logo-round.png" width="720" height="720" alt="">
            <div>
              <strong>A Cut Above</strong>
              <span>Lawn &amp; garden maintenance</span>
            </div>
          </div>
          <p class="small">Text details including pictures to</p>
          <a class="phone" href="{TEL}">{PHONE}</a>
          <span class="note">Free quote · Residential &amp; commercial · Hunter Valley</span>
          <a class="btn btn--solid" href="{TEL}">Call now</a>
        </div>
      </div>
    </section>

    <section id="services" class="band band--tint">
      <div class="wrap">
        <div class="head">
          <span class="eyebrow">What we do</span>
          <h2>The whole yard, kept in order</h2>
          <p>One crew for the regular jobs and the big clean-ups — mowing, hedges, garden care and pressure washing.</p>
        </div>
        <div class="svc-grid">
{services_html}
        </div>
      </div>
    </section>

    <section id="process" class="band process">
      <div class="wrap">
        <div class="head">
          <span class="eyebrow">How it runs</span>
          <h2>From your text to a tidy yard</h2>
          <p>Straightforward, and it starts with a free quote.</p>
        </div>
        <ol class="steps">
{process_html}
        </ol>
      </div>
    </section>

    <section class="band about-band">
      <div class="wrap">
        <p class="lead2">A Cut Above is a local lawn and garden maintenance crew looking after residential and commercial properties across the Hunter Valley.</p>
        <img src="assets/banner.jpg" width="2048" height="762" alt="A Cut Above the Best Lawn &amp; Garden Maintenance — lawn mowing, hedge trimming, planting and mulching, garden maintenance, clean ups, green waste removal and pressure washing">
      </div>
    </section>

    <section id="areas" class="band areas">
      <div class="wrap areas__grid">
        <div>
          <span class="eyebrow">Where we work</span>
          <h2>Covering the Hunter Valley</h2>
          <p style="color:var(--ink-2);margin-top:12px;">Regular runs across the region — if you're nearby, get in touch and we'll let you know.</p>
        </div>
        <ul class="area-list">
{areas_html}
        </ul>
      </div>
    </section>

    <section id="faq" class="band band--tint">
      <div class="wrap">
        <div class="head">
          <span class="eyebrow">Questions</span>
          <h2>Before you book</h2>
        </div>
        <div class="faq">
{faq_html}
        </div>
      </div>
    </section>

    <section id="contact" class="band contact">
      <div class="wrap">
        <div class="contact__card">
          <div>
            <span class="eyebrow">Get in touch</span>
            <h2>Text us for a free quote</h2>
            <p>Send the address and a picture or two of the yard, and a free quote comes straight back.</p>
            <div class="contact__meta">
              <div><span class="k">Phone</span><span class="v"><a href="{TEL}">{PHONE}</a></span></div>
              <div><span class="k">Service area</span><span class="v">Maitland · Newcastle · Lake Macquarie · Cessnock · Hunter Valley</span></div>
              <div><span class="k">Property</span><span class="v">Residential &amp; commercial</span></div>
            </div>
          </div>
          <div class="contact__cta">
            <a class="btn btn--acc" href="{TEL}">Call {PHONE}</a>
            <a class="btn btn--ghost" href="{FB}" target="_blank" rel="noopener">See our Facebook page</a>
            <small>Free quotes · Fully insured</small>
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer>
    <div class="wrap">
      <div class="foot__rule"></div>
      <div class="foot">
        <div class="foot__brand">
          <img class="foot__mark" src="assets/logo-round.png" width="720" height="720" alt="">
          <div>
            <div class="foot__name">A Cut Above the Best Lawn &amp; Garden Maintenance</div>
            <div class="foot__meta">Thornton, Maitland, NSW</div>
          </div>
        </div>
        <div class="foot__meta">Lawn &amp; garden maintenance · Hunter Valley, NSW · {PHONE}<br>© {YEAR} A Cut Above the Best Lawn &amp; Garden Maintenance</div>
      </div>
    </div>
  </footer>
</body>
</html>
'''
open(os.path.join(SITE, "index.html"), "w").write(HTML)
print("wrote index.html", len(HTML), "bytes")
