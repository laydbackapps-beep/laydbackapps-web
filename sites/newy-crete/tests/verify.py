import json
from pathlib import Path
from playwright.sync_api import sync_playwright

OUT = Path(__file__).parent
BASE = 'http://127.0.0.1:4173/newy-crete/'
report = {'console': [], 'page_errors': [], 'requests': [], 'checks': {}}
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--no-sandbox'])
    for name, width, height in [('desktop', 1440, 1000), ('mobile', 390, 844)]:
        page = browser.new_page(viewport={'width': width, 'height': height}, device_scale_factor=1)
        page.on('console', lambda m: report['console'].append({'type': m.type, 'text': m.text}) if m.type in ('warning','error') else None)
        page.on('pageerror', lambda e: report['page_errors'].append(str(e)))
        page.on('response', lambda r: report['requests'].append({'url': r.url, 'status': r.status}) if not r.ok else None)
        page.goto(BASE, wait_until='networkidle')
        page.wait_for_timeout(2500)
        page.screenshot(path=str(OUT / f'{name}-final-hero.png'), animations='disabled')
        report['checks'][name] = page.evaluate('''() => ({
            docWidth: document.documentElement.scrollWidth,
            innerWidth: innerWidth,
            images: [...document.images].map(i => ({src: i.getAttribute('src'),loaded: i.complete && i.naturalWidth>0,width: i.naturalWidth})),
            h1: document.querySelector('h1').getBoundingClientRect().toJSON(),
            hero: document.querySelector('.hero').getBoundingClientRect().toJSON(),
            tel: [...document.querySelectorAll('a[href^="tel:"]')].map(a=>a.getAttribute('href')),
            reduced: matchMedia('(prefers-reduced-motion: reduce)').matches
        })''')
        page.screenshot(path=str(OUT / f'{name}-initial-full.png'), full_page=True, animations='disabled')
        if width < 761:
            page.locator('.menu-toggle').click()
            report['checks']['menu_open'] = page.locator('.mobile-menu').is_visible()
            page.keyboard.press('Escape')
            report['checks']['menu_escape'] = not page.locator('.mobile-menu').is_visible()
            report['checks']['menu_focus'] = page.evaluate('document.activeElement.className')
        if width > 761:
            page.locator('.circle-link').click()
            page.wait_for_timeout(800)
            report['checks']['hero_cta_arrives'] = page.locator('#quote').evaluate('(el) => Math.abs(el.getBoundingClientRect().top) < 105')
        page.locator('#quoteForm button[type="submit"]').click()
        report['checks'][f'{name}_blocked_blank'] = page.locator('#name').evaluate('(e)=>!e.validity.valid')
        # Synthetic, intercepted successful response: verifies success state without creating a lead.
        page.route('**/functions/v1/quote-request', lambda route: route.fulfill(status=200, content_type='application/json', body='{"success":true}'))
        page.locator('#name').fill('Test visual only')
        page.locator('#phone').fill('0400000000')
        page.locator('#email').fill('visual-only@example.test')
        page.locator('#suburb').fill('Test suburb')
        page.locator('#message').fill('Intercepted browser validation. No request sent.')
        page.locator('#consent').check()
        with page.expect_request('**/functions/v1/quote-request') as caught:
            page.locator('#quoteForm button[type="submit"]').click()
        payload = json.loads(caught.value.post_data)
        report['checks'][f'{name}_payload'] = payload
        report['checks'][f'{name}_success'] = page.locator('#formStatus').inner_text()
        page.route('**/functions/v1/quote-request', lambda route: route.fulfill(status=503, content_type='application/json', body='{}'))
        page.locator('#name').fill('Test visual only')
        page.locator('#phone').fill('0400000000')
        page.locator('#suburb').fill('Test suburb')
        page.locator('#consent').check()
        page.locator('#quoteForm button[type="submit"]').click()
        page.wait_for_selector('#formStatus.error')
        report['checks'][f'{name}_error'] = page.locator('#formStatus').inner_text()
        page.close()
    reduced = browser.new_page(viewport={'width':390,'height':844}, reduced_motion='reduce')
    reduced.goto(BASE, wait_until='networkidle')
    report['checks']['reducedMotion'] = reduced.evaluate('''() => ({
        query: matchMedia('(prefers-reduced-motion: reduce)').matches,
        animation: getComputedStyle(document.querySelector('.hero-media')).animationName,
        revealOpacity: getComputedStyle(document.querySelector('.manifesto-content')).opacity
    })''')
    browser.close()
(OUT / 'verification-report.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
assert not report['page_errors']
for name in ['desktop','mobile']:
    c = report['checks'][name]
    assert c['docWidth'] == c['innerWidth'], f'{name} horizontal overflow'
    assert all(i['loaded'] for i in c['images']), f'{name} broken image'
    assert c['tel'] and all(t == 'tel:+61436486214' for t in c['tel']), 'wrong tel number'
    assert report['checks'][f'{name}_blocked_blank']
    assert report['checks'][f'{name}_payload']['business_name'] == 'Newy Concrete Solutions Pty Ltd'
    assert 'sent' in report['checks'][f'{name}_success']
    assert 'couldn' in report['checks'][f'{name}_error']
assert report['checks']['menu_open'] and report['checks']['menu_escape']
assert report['checks']['reducedMotion']['query']
print('ALL CHECKS PASSED')
