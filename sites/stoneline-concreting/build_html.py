#!/usr/bin/env python3
"""Build the Stoneline Concreting one-pager."""
import os, re
SITE = "/home/ogheesus/laydback-site/sites/stoneline-concreting"
A = os.path.join(SITE, "assets")

def inline(svg):
    s = svg.strip()
    s = re.sub(r'(<svg\b[^>]*?)\s+width="[^"]*"', r'\1', s, count=1)
    s = re.sub(r'(<svg\b[^>]*?)\s+height="[^"]*"', r'\1', s, count=1)
    return s

mark = inline(open(os.path.join(A, "logo-mark.svg")).read())
word = inline(open(os.path.join(A, "logo-word.svg")).read())
BRAND  = mark.replace('role="img" aria-label="Stoneline Concreting"', 'class="brand__mark" aria-hidden="true"')
BRANDW = word.replace('role="img" aria-label="Stoneline Concreting"', 'class="brand__word" aria-hidden="true"')
FOOTMARK = mark.replace('role="img" aria-label="Stoneline Concreting"', 'class="foot__mark" aria-hidden="true"')

YEAR = "2026"
IG = "https://www.instagram.com/stonelineconcreting/"

WORK = [
    ("p9.jpg",  480, 640, "Stone-look slab, finished beside the water."),
    ("p11.jpg", 480, 640, "Slab poured with control joints beside a retaining wall."),
    ("p10.jpg", 640, 480, "Reo mesh and formwork set out for a slab."),
    ("p4.jpg",  480, 640, "Site cut and levelling, ready for the pour."),
    ("p7.jpg",  640, 479, "Posts set in poured concrete footings beside a house."),
]

SERVICES = [
    ("Concrete driveways", "New driveways and extensions formed, poured and finished on site — including swirl and broom finishes with dummy joints matched to existing concrete."),
    ("Paths & patios", "Garden paths, alfresco areas and patio slabs set out, reinforced and poured to suit the levels of the block."),
    ("Slabs & footings", "Shed, extension and house slabs, plus post footings and pads poured and set."),
    ("Exposed aggregate & finishes", "Exposed aggregate, broom, swirl and colour finishes, with control and dummy joints cut to suit the slab."),
    ("Council crossovers", "Driveway crossovers formed to council requirements and poured, then inspected and passed."),
    ("Formwork, reo & set-out", "Set-out, excavation, timber formwork and reinforcing mesh prepared ahead of the pour."),
]

PROCESS = [
    ("Get in touch", "Send a DM with the address and a couple of photos for a free quote."),
    ("Set-out & excavation", "Levels set, the area cut to grade and the sub-base prepared."),
    ("Formwork & reo", "Formwork built to the shape and fall, then reinforcing mesh placed and tied."),
    ("Pour & screed", "Concrete poured, spread and screeded to level in one run."),
    ("Finish & joints", "Broom, swirl, colour or exposed aggregate finish applied, joints cut and the slab cured."),
]

FAQ = [
    ("What areas do you work in?", "Lake Macquarie and the wider Hunter, NSW — recent jobs have been in Blacksmiths, Cardiff, Valentine and Paxton."),
    ("What concrete work do you take on?", "Driveways, paths, patios, slabs, footings and council crossovers — new work and extensions to existing concrete."),
    ("Can you match existing concrete?", "Yes. Finishes such as swirl and broom can be matched to the existing slab, with dummy joints set out to line up."),
    ("What finishes can you do?", "Exposed aggregate, broom, swirl and colour finishes, with control joints cut to suit the slab."),
    ("How do I get a quote?", "Message through Instagram with the address and a photo or two of the area for a free quote."),
    ("Do you do council crossovers?", "Yes — crossovers are formed to council requirements and poured, ready for inspection."),
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
<title>Stoneline Concreting — Concreters in Lake Macquarie &amp; the Hunter</title>
<meta name="description" content="Stoneline Concreting — concrete driveways, paths, patios, slabs, footings and council crossovers across Lake Macquarie and the Hunter, NSW. Exposed aggregate, broom, swirl and colour finishes.">
<link rel="icon" href="assets/favicon.png" type="image/png">
<meta property="og:title" content="Stoneline Concreting — Concreters in Lake Macquarie &amp; the Hunter">
<meta property="og:description" content="Driveways, paths, patios, slabs and council crossovers. Exposed aggregate, broom, swirl and colour finishes across Lake Macquarie and the Hunter, NSW.">
<meta property="og:type" content="website">
<meta property="og:image" content="assets/logo-mark-512.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {{
    --paper: #f4f2ee;
    --card: #ffffff;
    --ink: #232323;
    --ink-2: #57514a;
    --ink-3: #837b71;
    --line: #e3ded4;
    --line-2: #d3ccbf;
    --acc: #a9872c;
    --gold: #c2a04c;
    --dark: #22201d;
    --wrap: 1180px;
    --r: 6px;
    --shadow: 0 1px 2px rgba(35,32,29,.06), 0 14px 34px -18px rgba(35,32,29,.32);
  }}
  * {{ box-sizing: border-box; }}
  body {{
    margin: 0; background: var(--paper); color: var(--ink);
    font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased;
  }}
  h1, h2, h3, .brand__word, .eyebrow, .btn, .chip, .svc__n, .step__n {{
    font-family: "Space Grotesk", "Inter", system-ui, sans-serif;
  }}
  h1, h2, h3 {{ margin: 0; letter-spacing: -0.02em; line-height: 1.05; font-weight: 700; }}
  p {{ margin: 0; }}
  img {{ display: block; max-width: 100%; height: auto; }}
  .wrap {{ max-width: var(--wrap); margin: 0 auto; padding: 0 28px; }}
  .eyebrow {{ display: inline-flex; align-items: center; gap: 9px; font-weight: 600; font-size: 12.5px;
    letter-spacing: .16em; text-transform: uppercase; color: var(--acc); }}
  .eyebrow::before {{ content: ""; width: 26px; height: 2px; background: var(--gold); display: inline-block; }}

  .nav {{ position: sticky; top: 0; z-index: 30; background: rgba(244,242,238,.88);
    backdrop-filter: saturate(1.4) blur(10px); border-bottom: 1px solid var(--line); }}
  .nav__in {{ display: flex; align-items: center; gap: 26px; height: 86px; }}
  .brand {{ display: inline-flex; align-items: center; gap: 11px; text-decoration: none; }}
  .brand__mark {{ height: 42px; width: 42px; flex: none; }}
  .brand__word {{ height: 31px; width: 118px; flex: none; }}
  .nav__links {{ display: flex; gap: 26px; margin-left: auto; }}
  .nav__links a {{ text-decoration: none; font-size: 15px; font-weight: 500; color: var(--ink-2); padding: 6px 0; }}
  .nav__links a:hover {{ color: var(--ink); }}
  .btn {{ display: inline-flex; align-items: center; gap: 8px; text-decoration: none; cursor: pointer;
    font-weight: 600; font-size: 15px; border-radius: var(--r); padding: 12px 20px; border: 1.5px solid transparent;
    transition: transform .15s ease, background .15s ease, color .15s ease; }}
  .btn--solid {{ background: var(--dark); color: #fff; }}
  .btn--solid:hover {{ background: #000; transform: translateY(-1px); }}
  .btn--ghost {{ border-color: var(--line-2); color: var(--ink); }}
  .btn--ghost:hover {{ border-color: var(--ink); }}
  .btn--gold {{ background: var(--gold); color: #241f10; }}
  .btn--gold:hover {{ background: #b2913c; transform: translateY(-1px); }}
  .nav__cta {{ margin-left: 6px; padding: 11px 18px; }}

  .hero {{ position: relative; padding: 74px 0 82px; overflow: hidden; }}
  .hero::before {{ content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px);
    background-size: 46px 46px; opacity: .5; mask-image: linear-gradient(180deg, #000, transparent 72%); }}
  .hero__in {{ position: relative; z-index: 1; display: grid; grid-template-columns: 1.1fr .9fr; gap: 44px; align-items: center; }}
  .hero h1 {{ font-size: clamp(36px, 4.8vw, 60px); margin: 20px 0 18px; }}
  .hero p.lead {{ color: var(--ink-2); font-size: 18.5px; max-width: 36ch; }}
  .hero__cta {{ display: flex; gap: 12px; margin: 28px 0 30px; flex-wrap: wrap; }}
  .chips {{ display: flex; flex-wrap: wrap; gap: 9px; }}
  .chip {{ font-size: 13px; font-weight: 600; color: var(--ink-2); background: #fff; border: 1px solid var(--line);
    border-radius: 999px; padding: 7px 13px; }}
  .chip b {{ color: var(--acc); font-weight: 700; }}
  .hero__card figure {{ margin: 0; max-width: 100%; margin-left: auto; background: #fff; border: 1px solid var(--line);
    border-radius: 10px; padding: 12px 12px 0; box-shadow: var(--shadow); }}
  .hero__card img {{ border-radius: 5px; width: 100%; }}
  .hero__card figcaption {{ font-size: 13px; color: var(--ink-3); padding: 12px 4px 14px; display: flex; align-items: center; gap: 8px; }}
  .hero__card figcaption::before {{ content: ""; width: 18px; height: 2px; background: var(--gold); }}

  section {{ scroll-margin-top: 96px; }}
  .band {{ padding: 84px 0; }}
  .band--tint {{ background: #fff; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }}
  .head {{ max-width: 680px; margin-bottom: 42px; }}
  .head h2 {{ font-size: clamp(28px, 3.4vw, 40px); margin: 16px 0 12px; }}
  .head p {{ color: var(--ink-2); }}

  .svc-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }}
  .svc {{ background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 26px 24px 28px; }}
  .svc__n {{ display: inline-block; font-weight: 700; font-size: 13px; letter-spacing: .12em; color: var(--acc); margin-bottom: 14px; }}
  .svc h3 {{ font-size: 19px; margin-bottom: 9px; }}
  .svc p {{ color: var(--ink-2); font-size: 15.5px; }}

  .process {{ background: var(--dark); color: #f2eee6; }}
  .process .eyebrow {{ color: var(--gold); }}
  .process h2 {{ color: #fff; }}
  .process .head p {{ color: #b6ada0; }}
  .steps {{ list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }}
  .steps li {{ border-top: 2px solid #423c33; padding-top: 18px; }}
  .step__n {{ display: block; font-weight: 700; font-size: 14px; color: var(--gold); letter-spacing: .1em; margin-bottom: 12px; }}
  .steps h3 {{ font-size: 17px; margin-bottom: 8px; color: #fff; }}
  .steps p {{ color: #b6ada0; font-size: 14.5px; }}

  .wrap--narrow {{ max-width: 940px; }}
  .work-grid {{ columns: 2; column-gap: 22px; }}
  .work__item {{ margin: 0 0 22px; break-inside: avoid; }}
  .work__item img {{ width: 100%; border-radius: 10px; border: 1px solid var(--line); background: #fff; }}
  .work__item figcaption {{ font-size: 13.5px; color: var(--ink-3); margin-top: 10px; }}

  .faq {{ max-width: 820px; }}
  .faq__item {{ border-bottom: 1px solid var(--line); }}
  .faq__item summary {{ list-style: none; cursor: pointer; padding: 20px 34px 20px 0; position: relative;
    font-family: "Space Grotesk", sans-serif; font-weight: 600; font-size: 18px; }}
  .faq__item summary::-webkit-details-marker {{ display: none; }}
  .faq__item summary::after {{ content: "+"; position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
    color: var(--acc); font-weight: 700; font-size: 22px; }}
  .faq__item[open] summary::after {{ content: "–"; }}
  .faq__item p {{ color: var(--ink-2); padding: 0 34px 22px 0; margin-top: -6px; }}

  .contact {{ background: #fff; border-top: 1px solid var(--line); }}
  .contact__card {{ display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center;
    border: 1px solid var(--line); border-radius: 14px; padding: 44px 46px; background: var(--paper); }}
  .contact h2 {{ font-size: clamp(28px, 3.4vw, 40px); margin: 16px 0 14px; }}
  .contact p {{ color: var(--ink-2); }}
  .contact__meta {{ display: grid; gap: 16px; margin-top: 26px; }}
  .contact__meta div {{ display: flex; gap: 12px; align-items: flex-start; }}
  .contact__meta .k {{ font-family: "Space Grotesk", sans-serif; font-weight: 600; font-size: 12.5px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--ink-3); min-width: 110px; padding-top: 3px; }}
  .contact__meta .v {{ font-weight: 500; }}
  .contact__meta a {{ color: var(--acc); text-decoration: none; border-bottom: 1.5px solid rgba(169,135,44,.35); }}
  .contact__cta {{ display: flex; flex-direction: column; gap: 14px; }}
  .contact__cta .btn {{ justify-content: center; font-size: 16px; padding: 15px 22px; }}
  .contact__cta small {{ color: var(--ink-3); text-align: center; }}

  footer {{ padding: 40px 0 52px; }}
  .foot {{ display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: space-between; }}
  .foot__brand {{ display: flex; align-items: center; gap: 13px; }}
  .foot__mark {{ height: 36px; width: 36px; }}
  .foot__name {{ font-family: "Space Grotesk", sans-serif; font-weight: 700; font-size: 16px; }}
  .foot__meta {{ color: var(--ink-3); font-size: 14px; text-align: right; }}
  .foot__rule {{ border-top: 1px solid var(--line); margin: 26px 0 22px; }}

  @media (max-width: 980px) {{
    .hero__in {{ grid-template-columns: 1fr; gap: 40px; }}
    .hero__card figure {{ margin: 0 auto; }}
    .svc-grid {{ grid-template-columns: repeat(2, 1fr); }}
    .steps {{ grid-template-columns: repeat(2, 1fr); }}
    .contact__card {{ grid-template-columns: 1fr; padding: 34px 28px; gap: 30px; }}
    .nav__links {{ display: none; }}
  }}
  @media (max-width: 560px) {{
    body {{ font-size: 16px; }}
    .wrap {{ padding: 0 20px; }}
    .band {{ padding: 62px 0; }}
    .svc-grid, .steps {{ grid-template-columns: 1fr; }}
    .work-grid {{ columns: 1; }}
    .hero h1 {{ font-size: 33px; }}
    .brand__word {{ height: 26px; width: 100px; }}
    .nav__cta {{ padding: 10px 14px; font-size: 14px; }}
    .foot__meta {{ text-align: left; }}
  }}
  @media (prefers-reduced-motion: reduce) {{ * {{ transition: none !important; }} }}
</style>
</head>
<body>
  <header class="nav">
    <div class="wrap nav__in">
      <a class="brand" href="#top" aria-label="Stoneline Concreting — home">
        {BRAND}
        {BRANDW}
      </a>
      <nav class="nav__links" aria-label="Sections">
        <a href="#services">Services</a>
        <a href="#process">Process</a>
        <a href="#work">Our work</a>
        <a href="#faq">FAQ</a>
      </nav>
      <a class="btn btn--gold nav__cta" href="{IG}" target="_blank" rel="noopener">Free quote</a>
    </div>
  </header>

  <main id="top">
    <section class="hero">
      <div class="wrap hero__in">
        <div>
          <span class="eyebrow">Concreting · Lake Macquarie &amp; the Hunter</span>
          <h1>Concrete driveways, paths and slabs, poured and finished properly.</h1>
          <p class="lead">Form, pour and finish for driveways, paths, patios, slabs and council crossovers across Lake Macquarie and the Hunter — exposed aggregate, broom, swirl and colour finishes.</p>
          <div class="hero__cta">
            <a class="btn btn--solid" href="{IG}" target="_blank" rel="noopener">Get a free quote</a>
            <a class="btn btn--ghost" href="#services">See services</a>
          </div>
          <div class="chips">
            <span class="chip"><b>Driveways</b> · paths · patios</span>
            <span class="chip">Slabs &amp; footings</span>
            <span class="chip">Exposed aggregate &amp; broom</span>
            <span class="chip">Council crossovers</span>
          </div>
        </div>
        <div class="hero__card">
          <figure>
            <img src="assets/p3.jpg" alt="Exposed aggregate concrete driveway extension alongside a new build" width="640" height="480">
            <figcaption>Exposed aggregate driveway extension, Lake Macquarie</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section id="services" class="band band--tint">
      <div class="wrap">
        <div class="head">
          <span class="eyebrow">What we do</span>
          <h2>Concrete work, set out and poured on site</h2>
          <p>From set-out and formwork through to the finish on the surface — driveways, paths, patios, slabs and crossovers.</p>
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
          <h2>From set-out to a finished slab</h2>
          <p>The five stages of a Stoneline pour, start to finish.</p>
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
          <h2>On the tools</h2>
          <p>Recent pours across Lake Macquarie and the Hunter.</p>
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
          <h2>Before you book a pour</h2>
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
            <h2>Message for a free quote</h2>
            <p>Quotes are done over Instagram. Send a message with the address and a photo or two of the area and you'll get a price back.</p>
            <div class="contact__meta">
              <div><span class="k">Service area</span><span class="v">Lake Macquarie &amp; the Hunter, NSW</span></div>
              <div><span class="k">Enquiries</span><span class="v"><a href="{IG}" target="_blank" rel="noopener">DM @stonelineconcreting</a></span></div>
              <div><span class="k">Work</span><span class="v">Driveways · paths · slabs · crossovers</span></div>
            </div>
          </div>
          <div class="contact__cta">
            <a class="btn btn--gold" href="{IG}" target="_blank" rel="noopener">Message on Instagram</a>
            <a class="btn btn--ghost" href="{IG}" target="_blank" rel="noopener">See more work</a>
            <small>Quotes via direct message</small>
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
          {FOOTMARK}
          <div>
            <div class="foot__name">Stoneline Concreting</div>
            <div class="foot__meta">Lake Macquarie &amp; the Hunter, NSW</div>
          </div>
        </div>
        <div class="foot__meta">Concreters · Lake Macquarie &amp; the Hunter, NSW<br>© {YEAR} Stoneline Concreting</div>
      </div>
    </div>
  </footer>
</body>
</html>
'''
open(os.path.join(SITE, "index.html"), "w").write(HTML)
print("wrote index.html", len(HTML), "bytes")
