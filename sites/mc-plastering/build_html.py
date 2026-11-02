#!/usr/bin/env python3
"""Build the MC Plastering one-pager (self-contained CSS)."""
import os
SITE = "/home/ogheesus/laydback-site/sites/mc-plastering"
A = os.path.join(SITE, "assets")

mark = open(os.path.join(A, "logo-mark.svg")).read()
word = open(os.path.join(A, "logo-word.svg")).read()
# strip xml/svg wrappers -> keep inner, but keep the outer svg element for inline use in nav
def inline(svg):
    import re
    s = svg.strip()
    # drop fixed width/height attributes so CSS (with the viewBox aspect) sizes it
    s = re.sub(r'(<svg\b[^>]*?)\s+width="[^"]*"', r'\1', s, count=1)
    s = re.sub(r'(<svg\b[^>]*?)\s+height="[^"]*"', r'\1', s, count=1)
    return s

BRAND = inline(mark).replace('role="img" aria-label="MC Plastering monogram"', 'class="brand__mark" aria-hidden="true"')
BRANDW = inline(word).replace('role="img" aria-label="Mack Childs Plastering"', 'class="brand__word" aria-hidden="true"')

YEAR = "2026"

WORK = [
    ("gal-3.jpg", 480, 640, "Walls and ceiling finished, set and ready to paint."),
    ("gal-4.jpg", 480, 640, "Taping and stopping a new garage ceiling."),
    ("gal-5.jpg", 480, 640, "Bedding and stopping a hallway wall to a flat finish."),
    ("gal-6.jpg", 480, 640, "Tray ceiling – joints stopped, screw holes filled."),
]

SERVICES = [
    ("New-build plastering", "Sheeting, fixing, taping and stopping through new homes and extensions — walls and ceilings carried through to a straight, paint-ready surface."),
    ("Renovation plastering", "Reworked walls and ceilings, new linings, patched openings and set joints for kitchens, bathrooms and full-home renovations."),
    ("Ceilings & cornice", "Flat and bulkhead ceilings, raked and tray details, plus cornice supply and installation to finish the junction between wall and ceiling."),
    ("Setting & finishing", "Bedding, taping, second and final coats, then sanding — the stopping that makes a wall flat enough to paint."),
    ("Crack & patch repairs", "Cracks, damaged plasterboard, water-affected ceilings and knocked corners repaired and blended back to the surrounding finish."),
    ("Garages & soffits", "Garage ceilings, eaves, alfresco and under-house soffits lined, stopped and finished."),
]

PROCESS = [
    ("Get in touch", "Send a DM with the address and a few photos of the space, or what you're planning."),
    ("Quote & measure", "We look at the areas, the linings and access, then come back with a clear quote."),
    ("Sheet & fix", "Plasterboard measured, cut and fixed to walls and ceilings — straight, square and set to the frame."),
    ("Stop, cornice & finish", "Joints bedded and taped, cornice fitted, coats built up and sanded to a paint-ready surface."),
    ("Handover", "Broom-clean and walk-through, ready for the painter to take over."),
]

FAQ = [
    ("What areas do you work in?", "Newcastle, Lake Macquarie and the wider Hunter Region in NSW."),
    ("Do you take on new builds and renovations?", "Yes — new build, renovation and repairs are the three areas of work the business is set up around."),
    ("How do I get a quote?", "Send a direct message through Instagram with the address and a photo or two of the area, and we'll arrange a look and a quote."),
    ("Do you repair cracks and damaged walls or ceilings?", "Yes. Cracks, damaged plasterboard, water-affected ceilings and corner damage are repaired and blended into the surrounding finish."),
    ("Do you install cornice and do the finishing?", "Yes — cornice, setting and sanding all come under the plastering work, so the surface is handed over ready to paint."),
    ("What kind of finish will I get?", "Walls and ceilings are setup, stopped and sanded to a flat, paint-ready finish for the painter to seal and topcoat."),
]

work_html = "\n".join(
    f'''        <figure class="work__item">
          <img src="assets/{f}" alt="{cap}" width="{w}" height="{h}" decoding="async">
          <figcaption>{cap}</figcaption>
        </figure>''' for f, w, h, cap in WORK)

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

HTML = f'''<!doctype html>
<html lang="en-AU">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>MC Plastering — Plasterer in Newcastle, Lake Macquarie &amp; the Hunter</title>
<meta name="description" content="MC Plastering Pty Ltd — plastering for new builds, renovations and repairs across Newcastle, Lake Macquarie and the Hunter Region, NSW. Ceilings, cornice, setting and finishing.">
<link rel="icon" href="assets/favicon.png" type="image/png">
<meta property="og:title" content="MC Plastering — Plasterer in Newcastle &amp; the Hunter">
<meta property="og:description" content="New builds, renovations and repairs. Ceilings, cornice, setting and finishing across Newcastle, Lake Macquarie and the Hunter Region, NSW.">
<meta property="og:type" content="website">
<meta property="og:image" content="assets/logo-mark-512.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {{
    --paper: #f7f5f2;
    --card: #ffffff;
    --ink: #14110f;
    --ink-2: #4c4642;
    --ink-3: #7b736c;
    --line: #e4dfd8;
    --line-2: #d6d0c8;
    --acc: #d84130;
    --acc-ink: #b03223;
    --wrap: 1180px;
    --r: 6px;
    --shadow: 0 1px 2px rgba(20,17,15,.05), 0 12px 32px -18px rgba(20,17,15,.28);
  }}
  * {{ box-sizing: border-box; }}
  html {{ -webkit-text-size-adjust: 100%; }}
  body {{
    margin: 0; background: var(--paper); color: var(--ink);
    font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased;
  }}
  h1, h2, h3, .brand__word, .eyebrow, .btn, .chip, .svc__n, .step__n {{
    font-family: "Archivo", "Inter", system-ui, sans-serif;
  }}
  h1, h2, h3 {{ margin: 0; letter-spacing: -0.022em; line-height: 1.04; font-weight: 800; }}
  p {{ margin: 0; }}
  a {{ color: inherit; }}
  img {{ display: block; max-width: 100%; height: auto; }}
  .wrap {{ max-width: var(--wrap); margin: 0 auto; padding: 0 28px; }}
  .eyebrow {{
    display: inline-flex; align-items: center; gap: 9px; font-weight: 700; font-size: 12.5px;
    letter-spacing: .14em; text-transform: uppercase; color: var(--acc-ink);
  }}
  .eyebrow::before {{ content: ""; width: 26px; height: 2px; background: var(--acc); display: inline-block; }}

  /* nav */
  .nav {{ position: sticky; top: 0; z-index: 30; background: rgba(247,245,242,.86);
    backdrop-filter: saturate(1.4) blur(10px); border-bottom: 1px solid var(--line); }}
  .nav__in {{ display: flex; align-items: center; gap: 26px; height: 86px; }}
  .brand {{ display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }}
  .brand__mark {{ height: 40px; width: 40px; flex: none; }}
  .brand__word {{ height: 30px; width: 125px; flex: none; }}
  .nav__links {{ display: flex; gap: 26px; margin-left: auto; }}
  .nav__links a {{ text-decoration: none; font-size: 15px; font-weight: 500; color: var(--ink-2); padding: 6px 0; }}
  .nav__links a:hover {{ color: var(--ink); }}
  .btn {{
    display: inline-flex; align-items: center; gap: 8px; text-decoration: none; cursor: pointer;
    font-weight: 700; font-size: 15px; letter-spacing: .005em; border-radius: var(--r);
    padding: 12px 20px; border: 1.5px solid transparent; transition: transform .15s ease, background .15s ease, color .15s ease;
  }}
  .btn--solid {{ background: var(--ink); color: #fff; }}
  .btn--solid:hover {{ background: #000; transform: translateY(-1px); }}
  .btn--ghost {{ border-color: var(--line-2); color: var(--ink); background: transparent; }}
  .btn--ghost:hover {{ border-color: var(--ink); }}
  .btn--acc {{ background: var(--acc); color: #fff; }}
  .btn--acc:hover {{ background: var(--acc-ink); transform: translateY(-1px); }}
  .nav__cta {{ margin-left: 6px; padding: 11px 18px; }}
  .nav__links, .nav__cta {{ }} 

  /* hero */
  .hero {{ position: relative; padding: 74px 0 82px; overflow: hidden; }}
  .hero::before {{
    content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image: radial-gradient(rgba(20,17,15,.055) 1px, transparent 1.4px);
    background-size: 22px 22px; mask-image: linear-gradient(180deg, #000, transparent 78%);
  }}
  .hero__in {{ position: relative; z-index: 1; display: grid; grid-template-columns: 1.12fr .88fr; gap: 44px; align-items: center; }}
  .hero h1 {{ font-size: clamp(38px, 5vw, 62px); margin: 20px 0 18px; }}
  .hero p.lead {{ color: var(--ink-2); font-size: 18.5px; max-width: 34ch; }}
  .hero__cta {{ display: flex; gap: 12px; margin: 28px 0 30px; flex-wrap: wrap; }}
  .chips {{ display: flex; flex-wrap: wrap; gap: 9px; }}
  .chip {{ font-size: 13px; font-weight: 600; color: var(--ink-2); background: #fff; border: 1px solid var(--line);
    border-radius: 999px; padding: 7px 13px; }}
  .chip b {{ color: var(--acc-ink); font-weight: 700; }}
  .hero__card {{ position: relative; }}
  .hero__card figure {{ margin: 0; max-width: 100%; margin-left: auto; background: #fff; border: 1px solid var(--line);
    border-radius: 10px; padding: 12px 12px 0; box-shadow: var(--shadow); }}
  .hero__card img {{ border-radius: 5px; width: 100%; }}
  .hero__card figcaption {{ font-size: 13px; color: var(--ink-3); padding: 12px 4px 14px; display: flex; align-items: center; gap: 8px; }}
  .hero__card figcaption::before {{ content: ""; width: 18px; height: 2px; background: var(--acc); }}

  /* section shell */
  section {{ scroll-margin-top: 96px; }}
  .band {{ padding: 84px 0; }}
  .band--tint {{ background: #fff; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }}
  .head {{ max-width: 660px; margin-bottom: 42px; }}
  .head h2 {{ font-size: clamp(28px, 3.4vw, 40px); margin: 16px 0 12px; }}
  .head p {{ color: var(--ink-2); }}

  /* services */
  .svc-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }}
  .svc {{ background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 26px 24px 28px; }}
  .svc__n {{ display: inline-block; font-weight: 800; font-size: 13px; letter-spacing: .1em; color: var(--acc); margin-bottom: 14px; }}
  .svc h3 {{ font-size: 19px; margin-bottom: 9px; letter-spacing: -0.01em; }}
  .svc p {{ color: var(--ink-2); font-size: 15.5px; }}

  /* process */
  .process {{ background: var(--ink); color: #f3f0ec; }}
  .process .eyebrow {{ color: #f0a99b; }}
  .process .eyebrow::before {{ background: var(--acc); }}
  .process h2 {{ color: #fff; }}
  .process .head p {{ color: #b9b2ab; }}
  .steps {{ list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }}
  .steps li {{ border-top: 2px solid #3a342f; padding-top: 18px; }}
  .step__n {{ display: block; font-weight: 800; font-size: 14px; color: var(--acc); letter-spacing: .08em; margin-bottom: 12px; }}
  .steps h3 {{ font-size: 17px; margin-bottom: 8px; color: #fff; }}
  .steps p {{ color: #b9b2ab; font-size: 14.5px; }}

  /* work */
  .wrap--narrow {{ max-width: 980px; }}
  .work-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }}
  .work__item {{ margin: 0; }}
  .work__item img {{ width: 100%; border-radius: 10px; border: 1px solid var(--line); background: #fff; }}
  .work__item figcaption {{ font-size: 13.5px; color: var(--ink-3); margin-top: 10px; }}

  /* faq */
  .faq {{ max-width: 820px; }}
  .faq__item {{ border-bottom: 1px solid var(--line); padding: 4px 0; }}
  .faq__item summary {{ list-style: none; cursor: pointer; padding: 20px 34px 20px 0; position: relative;
    font-family: "Archivo", sans-serif; font-weight: 700; font-size: 18px; letter-spacing: -0.01em; }}
  .faq__item summary::-webkit-details-marker {{ display: none; }}
  .faq__item summary::after {{ content: "+"; position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
    color: var(--acc); font-weight: 700; font-size: 22px; }}
  .faq__item[open] summary::after {{ content: "–"; }}
  .faq__item p {{ color: var(--ink-2); padding: 0 34px 22px 0; margin-top: -6px; }}

  /* contact */
  .contact {{ background: #fff; border-top: 1px solid var(--line); }}
  .contact__card {{ display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center;
    border: 1px solid var(--line); border-radius: 14px; padding: 44px 46px; background: var(--paper); }}
  .contact h2 {{ font-size: clamp(28px, 3.4vw, 40px); margin: 16px 0 14px; }}
  .contact p {{ color: var(--ink-2); }}
  .contact__meta {{ display: grid; gap: 16px; margin-top: 26px; }}
  .contact__meta div {{ display: flex; gap: 12px; align-items: flex-start; }}
  .contact__meta .k {{ font-family: "Archivo", sans-serif; font-weight: 700; font-size: 12.5px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--ink-3); min-width: 96px; padding-top: 3px; }}
  .contact__meta .v {{ font-weight: 500; }}
  .contact__meta a {{ color: var(--acc-ink); text-decoration: none; border-bottom: 1.5px solid rgba(176,50,35,.3); }}
  .contact__cta {{ display: flex; flex-direction: column; gap: 14px; }}
  .contact__cta .btn {{ justify-content: center; font-size: 16px; padding: 15px 22px; }}
  .contact__cta small {{ color: var(--ink-3); text-align: center; }}

  /* footer */
  footer {{ padding: 40px 0 52px; }}
  .foot {{ display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: space-between; }}
  .foot__brand {{ display: flex; align-items: center; gap: 12px; }}
  .foot__mark {{ height: 34px; width: 34px; }}
  .foot__name {{ font-family: "Archivo", sans-serif; font-weight: 700; font-size: 16px; }}
  .foot__meta {{ color: var(--ink-3); font-size: 14px; text-align: right; }}
  .foot__rule {{ border-top: 1px solid var(--line); margin: 26px 0 22px; }}

  @media (max-width: 980px) {{
    .hero__in {{ grid-template-columns: 1fr; gap: 40px; }}
    .hero__card figure {{ margin: 0 auto; }}
    .svc-grid {{ grid-template-columns: repeat(2, 1fr); }}
    .steps {{ grid-template-columns: repeat(2, 1fr); }}
    .work-grid {{ grid-template-columns: repeat(2, 1fr); }}
    .contact__card {{ grid-template-columns: 1fr; padding: 34px 28px; gap: 30px; }}
    .nav__links {{ display: none; }}
  }}
  @media (max-width: 560px) {{
    body {{ font-size: 16px; }}
    .wrap {{ padding: 0 20px; }}
    .band {{ padding: 62px 0; }}
    .svc-grid, .steps, .work-grid {{ grid-template-columns: 1fr; }}
    .work__item {{ max-width: 340px; }}
    .hero h1 {{ font-size: 34px; }}
    .brand__word {{ height: 26px; width: 108px; }}
    .nav__cta {{ padding: 10px 14px; font-size: 14px; }}
    .foot__meta {{ text-align: left; }}
  }}
  @media (prefers-reduced-motion: reduce) {{
    * {{ transition: none !important; scroll-behavior: auto !important; }}
  }}
</style>
</head>
<body>

  <header class="nav">
    <div class="wrap nav__in">
      <a class="brand" href="#top" aria-label="MC Plastering — home">
        {BRAND}
        {BRANDW}
      </a>
      <nav class="nav__links" aria-label="Sections">
        <a href="#services">Services</a>
        <a href="#process">Process</a>
        <a href="#work">Our work</a>
        <a href="#faq">FAQ</a>
      </nav>
      <a class="btn btn--acc nav__cta" href="https://www.instagram.com/mcplastering__/" target="_blank" rel="noopener">Get a quote</a>
    </div>
  </header>

  <main id="top">

    <section class="hero">
      <div class="wrap hero__in">
        <div class="hero__copy">
          <span class="eyebrow">Plastering · Newcastle &amp; the Hunter</span>
          <h1>New-build and renovation plastering, finished paint-ready.</h1>
          <p class="lead">Interior plastering across Newcastle, Lake Macquarie and the Hunter Region — new builds, renovations and repairs, from sheet and set through to a straight, sanded surface for the painter.</p>
          <div class="hero__cta">
            <a class="btn btn--solid" href="https://www.instagram.com/mcplastering__/" target="_blank" rel="noopener">Get a quote</a>
            <a class="btn btn--ghost" href="#services">See services</a>
          </div>
          <div class="chips">
            <span class="chip"><b>New builds</b> · renovations · repairs</span>
            <span class="chip">Ceilings &amp; cornice</span>
            <span class="chip">Setting &amp; finishing</span>
            <span class="chip">Hunter Region local</span>
          </div>
        </div>
        <div class="hero__card">
          <figure>
            <img src="assets/gal-2.jpg" alt="Plasterer bedding and stopping joints across a new ceiling" width="640" height="564">
            <figcaption>Ceiling plastering on a new-build, Hunter Region</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section id="services" class="band band--tint">
      <div class="wrap">
        <div class="head">
          <span class="eyebrow">What we do</span>
          <h2>Plastering for walls, ceilings and everything between</h2>
          <p>Sheet, set and finish — the work that turns a frame and a stack of plasterboard into a surface you can paint.</p>
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
          <h2>From first message to a paint-ready room</h2>
          <p>A straight, five-step run so you know what's happening on site and when.</p>
        </div>
        <ol class="steps">
{process_html}
        </ol>
      </div>
    </section>

    <section id="work" class="band">
      <div class="wrap wrap--narrow">
        <div class="head">
          <span class="eyebrow">Recent work</span>
          <h2>On the job</h2>
          <p>Photos from recent plastering across Newcastle and Lake Macquarie.</p>
        </div>
        <div class="work-grid">
{work_html}
        </div>
      </div>
    </section>

    <section id="faq" class="band band--tint">
      <div class="wrap">
        <div class="head">
          <span class="eyebrow">Questions</span>
          <h2>What people ask before they book</h2>
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
            <h2>Send through your job and get a quote</h2>
            <p>Bookings and enquiries are handled through Instagram. Send a message with the address and a photo or two of the area and we'll take it from there.</p>
            <div class="contact__meta">
              <div><span class="k">Service area</span><span class="v">Newcastle · Lake Macquarie · Hunter Region, NSW</span></div>
              <div><span class="k">Enquiries</span><span class="v"><a href="https://www.instagram.com/mcplastering__/" target="_blank" rel="noopener">DM @mcplastering__</a></span></div>
              <div><span class="k">Work</span><span class="v">New builds · Renovations · Repairs</span></div>
            </div>
          </div>
          <div class="contact__cta">
            <a class="btn btn--acc" href="https://www.instagram.com/mcplastering__/" target="_blank" rel="noopener">Message on Instagram</a>
            <a class="btn btn--ghost" href="https://www.instagram.com/mcplastering__/" target="_blank" rel="noopener">See more work</a>
            <small>Replies via direct message</small>
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
          {BRAND.replace('class="brand__mark"', 'class="foot__mark"')}
          <div>
            <div class="foot__name">MC Plastering Pty Ltd</div>
            <div class="foot__meta">Newcastle &amp; Lake Macquarie, NSW</div>
          </div>
        </div>
        <div class="foot__meta">Plasterer · Hunter Region, NSW<br>© {YEAR} MC Plastering Pty Ltd</div>
      </div>
    </div>
  </footer>

</body>
</html>
'''

open(os.path.join(SITE, "index.html"), "w").write(HTML)
print("wrote index.html", len(HTML), "bytes")
