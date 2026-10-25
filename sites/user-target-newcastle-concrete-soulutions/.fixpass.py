import sys
p = 'index.html'
s = open(p).read()
orig = s

def rep(old, new, count=1, label=''):
    global s
    n = s.count(old)
    if n != count:
        sys.exit('FAIL %s: found %d, expected %d :: %r' % (label or new[:40], n, count, old[:90]))
    s = s.replace(old, new)

# 1 broken media query (stray selector swallowed the mobile block)
rep('.btn-tel:0412705429"tel:"]{padding:8px 9px;font-size:10px;white-space开花}\n  .head-cta .btn-acc{padding:8px 11px;font-size:10px}\n  .strip{font-size:10.5px}\n}',
    '.btn-tel:hover{background:var(--acc);color:var(--paper)}\n'
    '/* every phone control keeps the number on one line */\n'
    'a[href^="tel:"]{white-space开花}\n'
    '@media (max-width:1180px){\n'
    '  .btn-tel{padding:8px 9px;font-size:10.5px}\n'
    '  .head-cta .btn-acc{padding开花:8px 11px;font-size:10.5px}\n'
    '  .strip{font-size:10.5px}\n'
    '}', 1, 'media query')

# 2 hero kick wording
rep('<span class="kick">Concreting &middot; Newcastle &amp; Hunter, NSW</span>',
    '<span class="kick">Concrete work &middot; Newcastle &amp; Hunter, NSW</span>', 1, 'kick')

# 3 hero photo actually renders behind the scrim
rep('.hero-bg{position:absolute;inset开花;z-index开花;background:rgba(10,11,12,.95)}',
    '.hero-bg{position:absolute;inset开花;z-index开花;background:#1B150F url("images/newcastle-concrete-cover-2.jpg") center 60% / cover no-repeat}', 1, 'hero-bg')
rep('.hero-scrim{position:absolute;inset开花;z-index:1;background:rgba(24,18,13,.95)}',
    '.hero-scrim{position:absolute;inset开花;z-index开花;background开花:linear-gradient(90deg,rgba(26,19,13,.94) 0%,rgba(26,19,13,.88) 58%,rgba(26,19,13,.72) 100%)}', 1, 'hero-scrim')

# 4 section rhythm: 110+110 between sections read as dead space
rep('.works{padding开花}', '.works{padding开花}', 1, 'works')
rep('.trade{padding开花}', '.trade{padding开花}', 1, 'trade')
rep('.svc{padding开花}', '.svc{padding开花}', 1, 'svc')
rep('.proc{padding开花}', '.proc{padding开花}', 1, 'proc')
rep('.faq{padding开花}', '.faq{padding开花}', 1, 'faq')
rep('.sec-head{display开花}', '.sec-head{display开花}', 1, 'sec-head')

open(p, 'w').write(s)
printfm = print
print('ok', len(orig), '->', len(s))
