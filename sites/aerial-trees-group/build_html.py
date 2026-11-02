#!/usr/bin/env python3
"""Build the Aerial Trees Group one-pager."""
import os, re
SITE = "/home/ogheesus/laydback-site/sites/aerial-trees-group"
A = os.path.join(SITE, "assets")

def inline(svg):
    s = svg.strip()
    s = re.sub(r'(<svg\b[^>]*?)\s+width="[^"]*"', r'\1', s, count=1)
    s = re.sub(r'(<svg\b[^>]*?)\s+height="[^"]*"', r'\1', s, count=1)
    return s

BRANDW = inline(open(os.path.join(A, "logo-word.svg")).read()).replace(
    'role="img" aria-label="Aerial Trees Group — tree services &amp; stump grinding"', 'class="brand__word" aria-hidden="true"')

PHONE = "(02) 4358 2000"; TEL = "tel:0243582000"
EMAIL = "aerialtrees@hotmail.com"
FB = "https://www.facebook.com/aerialtreesgroup/"
YEAR = "2026"

WORK = [
    ("w1_before.jpg", 448, 380, "Before — a large gum overhanging the roof."),
    ("w2_after.jpg", 448, 380, "After — the overhanging limbs removed."),
    ("reel.jpg", 540, 960, "Sectioning a log on site."),
    ("w4_after.jpg", 456, 370, "Stump ground out, area cleared."),
]

SERVICES = [
    ("Tree removal", "Whole-tree removals, sectioned down safely where access is tight or the tree sits over a roof, fence or shed."),
    ("Trimming & pruning", "Deadwooding, canopy lifting and pruning to take the weight out of overhanging limbs and make the property safer."),
    ("Stump grinding", "Stumps ground out below ground level and the site cleared, so the area can be replanted or covered."),
    ("Chipping & mulch", "Branches chipped on site, with mulch left for the garden or taken away."),
    ("Aerial / elevated access", "An elevated work platform for trees that can't be climbed or that sit near buildings and powerlines."),
    ("Green waste removal", "Everything cut on site cleared away, leaving the yard tidy."),
]

PROCESS = [
    ("Free quote", "Call or email with the address — free quotes, all areas."),
    ("Assess the tree", "The tree, the access and what's around it are looked at before anything is cut."),
    ("The work", "Climbed, platform or ground-worked — the tree is sectioned down safely."),
    ("Stump & clean up", "The stump is ground out and the site cleared and chipped."),
]

FAQ = [
    ("What areas do you cover?", "The Central Coast, Lake Macquarie, Newcastle and the wider Hunter Valley."),
    ("How long have you been in business?", "The business has been established, experienced and insured for over 20 years."),
    ("Do you grind stumps as well?", "Yes — stump grinding is part of the service; stumps are ground out below ground level."),
    ("Can you remove trees near houses or powerlines?", "Yes. Trees are sectioned down and an elevated work platform is used where a tree can't be climbed or sits close to a building."),
    ("How do I get a quote?", "Call (02) 4358 2000 or email aerialtrees@hotmail.com for a free quote."),
    ("Do you take the green waste away?", "Branches are chipped on site — mulch can be left for the garden or removed with the rest of the green waste."),
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
<title>Aerial Trees Group — Tree Services &amp; Stump Grinding, Lake Munmorah NSW</title>
<meta name="description" content="Aerial Trees Group — tree removal, trimming, stump grinding, chipping and green waste removal. Established, experienced and insured for over 20 years. Free quotes across the Central Coast, Lake Macquarie, Newcastle and the Hunter Valley.">
<link rel="icon" href="assets/favicon.png" type="image/png">
<meta property="og:title" content="Aerial Trees Group — Tree Services &amp; Stump Grinding, Lake Munmorah">
<meta property="og:description" content="Tree removal, trimming and stump grinding. Insured, 20+ years. Free quotes across the Central Coast, Lake Macquarie, Newcastle and the Hunter Valley. (02) 4358 2000.">
<meta property="og:type" content="website">
<meta property="og:image" content="assets/logo-round.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  :root {{
    --paper: #f7f6f3; --card: #ffffff; --ink: #1b1a17; --ink-2: #4c4a44; --ink-3: #7c7972;
    --line: #e4e1da; --line-2: #d2cdc2; --acc: #d97a0e; --acc-ink: #a85806; --gold: #fdbd06;
    --green: #4c8a1e; --dark: #17240f; --wrap: 1180px; --r: 6px;
    --shadow: 0 1px 2px rgba(27,26,23,.06), 0 14px 34px -18px rgba(27,26,23,.3);
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: var(--paper); color: var(--ink);
    font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    font-size: 17px; line-height: 1.6; -webkit-font-smoothing: antialiased; }}
  h1, h2, h3, .brand__word, .eyebrow, .btn, .chip, .svc__n, .step__n, .foot__name {{
    font-family: "Sora", "Inter", system-ui, sans-serif; }}
  h1, h2, h3 {{ margin: 0; letter-spacing: -0.02em; line-height: 1.06; font-weight: 700; }}
  p {{ margin: 0; }}
  img {{ display: block; max-width: 100%; height: auto; }}
  .wrap {{ max-width: var(--wrap); margin: 0 auto; padding: 0 28px; }}
  .eyebrow {{ display: inline-flex; align-items: center; gap: 9px; font-weight: 600; font-size: 12.5px;
    letter-spacing: .13em; text-transform: uppercase; color: var(--acc-ink); }}
  .eyebrow::before {{ content: ""; width: 26px; height: 2px; background: var(--acc); display: inline-block; }}

  .nav {{ position: sticky; top: 0; z-index: 30; background: rgba(247,246,243,.9);
    backdrop-filter: saturate(1.4) blur(10px); border-bottom: 1px solid var(--line); }}
  .nav__in {{ display: flex; align-items: center; gap: 24px; height: 90px; }}
  .brand {{ display: inline-flex; align-items: center; gap: 12px; text-decoration: none; }}
  .brand__mark {{ height: 52px; width: 52px; flex: none; border-radius: 50%; }}
  .brand__word {{ height: 34px; width: 162px; flex: none; }}
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

  .hero {{ position: relative; padding: 72px 0 82px; overflow: hidden; }}
  .hero::before {{ content: ""; position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image: radial-gradient(rgba(27,26,23,.05) 1px, transparent 1.5px); background-size: 24px 24px;
    mask-image: linear-gradient(180deg, #000, transparent 74%); }}
  .hero__in {{ position: relative; z-index: 1; display: grid; grid-template-columns: 1.08fr .92fr; gap: 46px; align-items: center; }}
  .hero h1 {{ font-size: clamp(36px, 4.8vw, 58px); margin: 20px 0 18px; font-weight: 800; }}
  .hero p.lead {{ color: var(--ink-2); font-size: 18.5px; max-width: 35ch; }}
  .hero__cta {{ display: flex; gap: 12px; margin: 28px 0 30px; flex-wrap: wrap; }}
  .chips {{ display: flex; flex-wrap: wrap; gap: 9px; }}
  .chip {{ font-size: 13px; font-weight: 600; color: var(--ink-2); background: #fff; border: 1px solid var(--line);
    border-radius: 999px; padding: 7px 13px; }}
  .chip b {{ color: var(--acc-ink); font-weight: 700; }}
  .hero__card figure {{ margin: 0 auto 0 auto; max-width: 448px; background: #fff; border: 1px solid var(--line);
    border-radius: 10px; padding: 12px 12px 0; box-shadow: var(--shadow); }}
  .hero__card img {{ border-radius: 4px; width: 100%; }}
  .hero__card figcaption {{ font-size: 13px; color: var(--ink-3); padding: 12px 4px 14px; display: flex; align-items: center; gap: 8px; }}
  .hero__card figcaption::before {{ content: ""; width: 18px; height: 2px; background: var(--acc); }}

  section {{ scroll-margin-top: 100px; }}
  .band {{ padding: 84px 0; }}
  .band--tint {{ background: #fff; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }}
  .head {{ max-width: 640px; margin-bottom: 42px; }}
  .head h2 {{ font-size: clamp(28px, 3.4vw, 40px); margin: 16px 0 12px; }}
  .head p {{ color: var(--ink-2); }}

  .svc-grid {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }}
  .svc {{ background: var(--paper); border: 1px solid var(--line); border-radius: 10px; padding: 26px 24px 28px; }}
  .svc__n {{ display: inline-block; font-weight: 700; font-size: 13px; letter-spacing: .12em; color: var(--acc); margin-bottom: 14px; }}
  .svc h3 {{ font-size: 19px; margin-bottom: 9px; }}
  .svc p {{ color: var(--ink-2); font-size: 15.5px; }}

  .process {{ background: var(--dark); color: #eaf0e2; }}
  .process .eyebrow {{ color: var(--gold); }}
  .process h2 {{ color: #fff; }}
  .process .head p {{ color: #a7b39a; }}
  .steps {{ list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }}
  .steps li {{ border-top: 2px solid #33452a; padding-top: 18px; }}
  .step__n {{ display: block; font-weight: 700; font-size: 14px; color: var(--gold); letter-spacing: .1em; margin-bottom: 12px; }}
  .steps h3 {{ font-size: 17px; margin-bottom: 8px; color: #fff; }}
  .steps p {{ color: #a7b39a; font-size: 14.5px; }}

  .wrap--narrow {{ max-width: 940px; }}
  .work-grid {{ columns: 2; column-gap: 22px; }}
  .work__item {{ margin: 0 0 22px; break-inside: avoid; }}
  .work__item img {{ width: 100%; border-radius: 10px; border: 1px solid var(--line); background: #fff; }}
  .work__item figcaption {{ font-size: 13.5px; color: var(--ink-3); margin-top: 10px; }}

  .faq {{ max-width: 820px; }}
  .faq__item {{ border-bottom: 1px solid var(--line); }}
  .faq__item summary {{ list-style: none; cursor: pointer; padding: 20px 34px 20px 0; position: relative;
    font-family: "Sora", sans-serif; font-weight: 600; font-size: 18px; }}
  .faq__item summary::-webkit-details-marker {{ display: none; }}
  .faq__item summary::after {{ content: "+"; position: absolute; right: 4px; top: 50%; transform: translateY(-50%);
    color: var(--acc); font-weight: 700; font-size: 22px; }}
  .faq__item[open] summary::after {{ content: "–"; }}
  .faq__item p {{ color: var(--ink-2); padding: 0 34px 22px 0; margin-top: -6px; }}

  .contact {{ background: #fff; border-top: 1px solid var(--line); }}
  .contact__card {{ display: grid; grid-template-columns: 1.1fr .9fr; gap: 46px; align-items: center;
    border: 1px solid var(--line); border-radius: 14px; padding: 44px 46px; background: var(--paper); }}
  .contact h2 {{ font-size: clamp(28px, 3.4vw, 40px); margin: 16px 0 14px; }}
  .contact p {{ color: var(--ink-2); }}
  .contact__meta {{ display: grid; gap: 16px; margin-top: 26px; }}
  .contact__meta div {{ display: flex; gap: 12px; align-items: flex-start; }}
  .contact__meta .k {{ font-family: "Sora", sans-serif; font-weight: 600; font-size: 12.5px; letter-spacing: .1em;
    text-transform: uppercase; color: var(--ink-3); min-width: 96px; padding-top: 3px; }}
  .contact__meta .v {{ font-weight: 500; }}
  .contact__meta a {{ color: var(--acc-ink); text-decoration: none; border-bottom: 1.5px solid rgba(168,88,6,.3); }}
  .contact__cta {{ display: flex; flex-direction: column; gap: 14px; }}
  .contact__cta .btn {{ justify-content: center; font-size: 16px; padding: 15px 22px; }}
  .contact__cta small {{ color: var(--ink-3); text-align: center; }}

  footer {{ padding: 40px 0 52px; }}
  .foot {{ display: flex; align-items: center; gap: 16px; flex-wrap: wrap; justify-content: space-between; }}
  .foot__brand {{ display: flex; align-items: center; gap: 13px; }}
  .foot__mark {{ height: 44px; width: 44px; border-radius: 50%; }}
  .foot__name {{ font-family: "Sora", sans-serif; font-weight: 700; font-size: 16px; }}
  .foot__meta {{ color: var(--ink-3); font-size: 14px; text-align: right; }}
  .foot__rule {{ border-top: 1px solid var(--line); margin: 26px 0 22px; }}

  @media (max-width: 980px) {{
    .hero__in {{ grid-template-columns: 1fr; gap: 40px; }}
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
    .brand__word {{ height: 27px; width: 128px; }}
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
      <a class="brand" href="#top" aria-label="Aerial Trees Group — home">
        <img class="brand__mark" src="assets/logo-round.png" width="720" height="720" alt="Aerial Trees Group logo">
        {BRANDW}
      </a>
      <nav class="nav__links" aria-label="Sections">
        <a href="#services">Services</a>
        <a href="#process">Process</a>
        <a href="#work">Our work</a>
        <a href="#faq">FAQ</a>
      </nav>
      <a class="btn btn--acc nav__cta" href="{TEL}">Call {PHONE}</a>
    </div>
  </header>

  <main id="top">
    <section class="hero">
      <div class="wrap hero__in">
        <div>
          <span class="eyebrow">Tree Services &amp; Stump Grinding · Lake Munmorah</span>
          <h1>Tree removal, pruning and stump grinding, done safely.</h1>
          <p class="lead">All tree services and stump grinding across the Central Coast, Lake Macquarie, Newcastle and the Hunter Valley — established, experienced and insured for over 20 years.</p>
          <div class="hero__cta">
            <a class="btn btn--acc" href="{TEL}">Call for a free quote</a>
            <a class="btn btn--ghost" href="#services">See services</a>
          </div>
          <div class="chips">
            <span class="chip"><b>20+ years</b> established</span>
            <span class="chip">Insured</span>
            <span class="chip">Free quotes — all areas</span>
            <span class="chip">Stump grinding</span>
          </div>
        </div>
        <div class="hero__card">
          <figure>
            <img src="assets/w3_before.jpg" alt="Tree assessed beside a fence line before removal" width="450" height="370">
            <figcaption>A tree assessed before removal, Lake Munmorah</figcaption>
          </figure>
        </div>
      </div>
    </section>

    <section id="services" class="band band--tint">
      <div class="wrap">
        <div class="head">
          <span class="eyebrow">What we do</span>
          <h2>All tree services &amp; stump grinding</h2>
          <p>From a single overhanging limb to a full removal and stump grind — one crew, one job.</p>
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
          <h2>From a phone call to a cleared site</h2>
          <p>Free quotes, careful work, and the site left clean.</p>
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
          <h2>On the job around Lake Munmorah</h2>
          <p>A removal, a stump grind and pruning from recent jobs.</p>
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
            <h2>Free quotes, all areas</h2>
            <p>Call or email with the address and what needs doing, and a free quote comes back.</p>
            <div class="contact__meta">
              <div><span class="k">Phone</span><span class="v"><a href="{TEL}">{PHONE}</a></span></div>
              <div><span class="k">Email</span><span class="v"><a href="mailto:{EMAIL}">{EMAIL}</a></span></div>
              <div><span class="k">Address</span><span class="v">295 Pacific Highway, Lake Munmorah NSW</span></div>
              <div><span class="k">Service area</span><span class="v">Central Coast · Lake Macquarie · Newcastle · Hunter Valley</span></div>
            </div>
          </div>
          <div class="contact__cta">
            <a class="btn btn--acc" href="{TEL}">Call {PHONE}</a>
            <a class="btn btn--ghost" href="mailto:{EMAIL}">Email a free quote</a>
            <small>Established, insured, 20+ years</small>
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
            <div class="foot__name">Aerial Trees Group</div>
            <div class="foot__meta">Lake Munmorah, NSW</div>
          </div>
        </div>
        <div class="foot__meta">Tree services &amp; stump grinding · Central Coast &amp; the Hunter, NSW · {PHONE}<br>© {YEAR} Aerial Trees Group</div>
      </div>
    </div>
  </footer>
</body>
</html>
'''
open(os.path.join(SITE, "index.html"), "w").write(HTML)
print("wrote index.html", len(HTML), "bytes")
