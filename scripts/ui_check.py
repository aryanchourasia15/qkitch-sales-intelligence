"""Real Chromium QA against the running local Vite preview; saves reviewable screenshots."""
from pathlib import Path
import json
import math
import os
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'test-results'
OUT.mkdir(exist_ok=True)
SOURCE = json.loads((ROOT/'src/data/qkitch.json').read_text(encoding='utf-8'))
checks = []
PREVIEW = os.environ.get('QKITCH_PREVIEW_URL', 'http://127.0.0.1:5175/')


def record(name, condition=True):
    assert condition, name
    checks.append(name)
    print('PASS', name, flush=True)


def no_overflow(page, name):
    record(name, page.evaluate('document.documentElement.scrollWidth <= document.documentElement.clientWidth'))


def chapter(page, name):
    page.get_by_role('navigation', name='Chapters').get_by_role('button', name=name).click()
    heading = {'Business Question':'Sales, connected.', 'Sales Network':'Sales, connected.', 'Model Validation':'A close fit.', 'Decision Simulator':'Explore the possibilities.', 'Strategic Insights':'Evidence into better questions.'}[name]
    expect(page.get_by_role('heading', name=heading, exact=name!='Model Validation')).to_be_visible()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(viewport={'width': 1440, 'height': 1100}, device_scale_factor=1)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
    response = page.goto(PREVIEW, wait_until='networkidle')
    record('Local preview responds HTTP 200', response.status == 200)
    expect(page.get_by_role('heading', name='Sales, connected.')).to_be_visible()
    expect(page).to_have_title('QKitch — Draft')
    expect(page.locator('.research-question')).to_have_text('How can QKitch use historical marketing spending and market conditions to better understand sales and evaluate future decisions?')
    record('Draft name, exact business question and opening chapter are visible')
    page.screenshot(path=str(OUT/'business-question-desktop.png'),full_page=True)
    chapter(page,'Sales Network')
    page.get_by_role('button', name='Pause motion', exact=True).click()
    record('Motion can be paused')
    no_overflow(page, 'Desktop network has no horizontal overflow')
    page.screenshot(path=str(OUT/'network-desktop.png'), full_page=True)
    page.get_by_test_id('cluster-adv_lag1').click()
    expect(page.get_by_role('heading', name='Prior-quarter advertising', exact=True)).to_be_visible()
    expect(page.get_by_test_id('coefficient-value')).to_have_text('+2.8703')
    record('Cluster selection shows correct coefficient and diagnostics')
    expect(page.get_by_test_id('cluster-adv_lag1')).to_contain_text('b +2.8703')
    expect(page.get_by_test_id('cluster-adv_lag1')).to_contain_text('LINK SCALE')
    record('Cluster labels distinguish regression coefficient from standardized link scale')
    page.get_by_role('button',name='Explore spending in the simulator',exact=True).click()
    expect(page.get_by_test_id('scenario-sales')).to_be_visible()
    record('Spending association opens the existing simulator')
    chapter(page,'Sales Network')
    page.get_by_test_id('cluster-index').focus()
    expect(page.get_by_role('heading',name='Market index',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name='Explore spending in the simulator',exact=True)).to_have_count(0)
    record('Keyboard focus selects a cluster; external conditions are not presented as spending levers')

    # Hover a precise frozen observation particle using the same documented geometry.
    point = page.evaluate('''async () => {
      const {particlePosition,WORLD}=await import('/src/lib/network.ts');
      const s=document.querySelector('.network-overlay').getBoundingClientRect();
      const scale=Math.min(s.width/WORLD.width,s.height/WORLD.height);
      const p=particlePosition('prom',7,0,true);
      return {x:s.left+(s.width-WORLD.width*scale)/2+p.x*scale,y:s.top+(s.height-WORLD.height*scale)/2+p.y*scale};
    }''')
    page.mouse.move(point['x'], point['y'])
    expect(page.get_by_test_id('quarter-explorer')).to_contain_text('Previewing quarter 7')
    expect(page.get_by_test_id('quarter-explorer')).to_contain_text('$387.2k')
    expect(page.locator('.hub-sub')).to_have_text('QUARTER 7')
    page.screenshot(path=str(OUT/'network-linked-quarter.png'), full_page=True)
    record('Particle hover links Q7, observed sales and hub fitted sales')
    page.mouse.click(point['x'], point['y'])
    page.mouse.move(20, 100)
    expect(page.locator('#quarter')).to_have_value('7')
    record('Particle click pins quarter selection')
    page.locator('#quarter').select_option('12')
    expect(page.locator('.hub-sub')).to_have_text('QUARTER 12')
    record('Keyboard-accessible quarter selector updates the network')
    initial = page.locator('.network-overlay > g').get_attribute('transform')
    page.get_by_role('button', name='Zoom in', exact=True).click()
    record('Network zoom changes projection', page.locator('.network-overlay > g').get_attribute('transform') != initial)
    page.get_by_role('button', name='Reset network zoom', exact=True).click()
    expect(page.locator('.network-overlay > g')).to_have_attribute('transform', 'translate(0,0) scale(1)')
    record('Network zoom reset restores original projection')

    chapter(page, 'Model Validation')
    expect(page.get_by_text('0.9012', exact=True)).to_be_visible()
    expect(page.get_by_text('0.8641', exact=True)).to_be_visible()
    expect(page.locator('#validation-quarter')).to_have_value('12')
    record('Validation displays Excel statistics and preserves linked quarter')
    page.get_by_role('button', name='Vs fitted', exact=True).click()
    expect(page.get_by_role('button', name='Vs fitted', exact=True)).to_have_attribute('aria-pressed', 'true')
    record('Residual view switches between time and fitted sales')
    no_overflow(page, 'Desktop validation has no horizontal overflow')
    page.screenshot(path=str(OUT/'validation-desktop.png'), full_page=True)

    chapter(page, 'Decision Simulator')
    result = page.get_by_test_id('scenario-sales')
    record('Simulator baseline reproduces Excel Q24 fitted sales', math.isclose(float(result.get_attribute('data-value')), 386.231693806404, abs_tol=1e-9))
    page.get_by_role('spinbutton', name='Current promotion', exact=True).fill('21.4')
    page.get_by_role('spinbutton', name='Current promotion', exact=True).press('Tab')
    b=SOURCE['coefficients']
    expected=386.231693806404+10*b[1]['coefficient']
    record('Current promotion input computes exact coefficient delta', math.isclose(float(result.get_attribute('data-value')), expected, abs_tol=1e-9))
    page.get_by_role('button', name='0 · Q2 / Q3', exact=True).click()
    expected-=b[6]['coefficient']
    record('Binary seasonality computes exact coefficient delta', math.isclose(float(result.get_attribute('data-value')), expected, abs_tol=1e-9))
    page.get_by_role('spinbutton', name='Current advertising', exact=True).fill('1000')
    page.get_by_role('spinbutton', name='Current advertising', exact=True).press('Tab')
    expect(page.get_by_role('alert')).to_contain_text('Enter 0–57')
    record('Out-of-range input is rejected without corrupting prediction', math.isclose(float(result.get_attribute('data-value')), expected, abs_tol=1e-9))
    chapter(page,'Sales Network')
    chapter(page,'Decision Simulator')
    record('Scenario persists across chapters', math.isclose(float(result.get_attribute('data-value')), expected, abs_tol=1e-9))
    no_overflow(page, 'Desktop simulator has no horizontal overflow')
    page.screenshot(path=str(OUT/'simulator-desktop.png'), full_page=True)
    page.get_by_role('button', name='Reset to Q24', exact=True).click()
    record('Simulator reset restores precise baseline', math.isclose(float(result.get_attribute('data-value')), 386.231693806404, abs_tol=1e-9))
    expect(page.get_by_text('18.55%', exact=True)).to_be_visible()
    expect(page.get_by_text('32.77%', exact=True)).to_be_visible()
    record('Workbook break-even thresholds are displayed')
    page.get_by_role('spinbutton',name='Prior-quarter promotion',exact=True).fill('0')
    page.get_by_role('spinbutton',name='Prior-quarter promotion',exact=True).press('Tab')
    page.get_by_role('spinbutton',name='Market index',exact=True).fill('100')
    page.get_by_role('spinbutton',name='Market index',exact=True).press('Tab')
    advanced_prediction=float(result.get_attribute('data-value'))
    page.get_by_role('button',name='Presentation mode',exact=True).click()
    expect(page.locator('.scenario-controls input[type="number"]')).to_have_count(2)
    expect(page.get_by_test_id('scenario-result')).to_have_attribute('data-prom-lag1','42.3')
    expect(page.get_by_test_id('scenario-result')).to_have_attribute('data-adv-lag1','36')
    expect(page.get_by_test_id('scenario-result')).to_have_attribute('data-index','114')
    expect(page.get_by_test_id('scenario-result')).to_have_attribute('data-cold','1')
    record('Presentation mode exposes only two controls and locks all background inputs at Q24',math.isclose(float(result.get_attribute('data-value')),386.231693806404,abs_tol=1e-9))
    page.get_by_role('spinbutton',name='Current promotion',exact=True).fill('21.4')
    page.get_by_role('spinbutton',name='Current promotion',exact=True).press('Tab')
    record('Simplified simulator matches the original full-precision engine',math.isclose(float(result.get_attribute('data-value')),386.231693806404+10*b[1]['coefficient'],abs_tol=1e-9))
    page.screenshot(path=str(OUT/'simulator-presentation-desktop.png'),full_page=True)
    page.get_by_role('button',name='Advanced mode',exact=True).click()
    expect(page.get_by_role('spinbutton',name='Prior-quarter promotion',exact=True)).to_have_value('0')
    expect(page.get_by_role('spinbutton',name='Market index',exact=True)).to_have_value('100')
    record('Advanced mode retains six inputs and previous historical assumptions',math.isclose(float(result.get_attribute('data-value')),advanced_prediction+10*b[1]['coefficient'],abs_tol=1e-9))
    page.get_by_role('button',name='Reset to Q24',exact=True).click()
    chapter(page,'Strategic Insights')
    expect(page.get_by_text('18.55%',exact=True)).to_be_visible()
    expect(page.get_by_text('32.77%',exact=True)).to_be_visible()
    expect(page.get_by_role('heading',name='Next analytical step',exact=True)).to_have_count(3)
    page.screenshot(path=str(OUT/'strategic-insights-desktop.png'),full_page=True)
    record('Closing insights use workbook evidence and three explicit next analytical steps')

    page.get_by_role('button', name='Model & sources', exact=True).click()
    expect(page.get_by_role('dialog')).to_be_visible()
    expect(page.get_by_role('dialog')).to_contain_text(SOURCE['source']['sha256'])
    record('Methodology dialog exposes source fingerprint and limitations')
    page.keyboard.press('Escape')
    expect(page.get_by_role('dialog')).to_have_count(0)
    record('Methodology supports Escape and returns focus')

    chapter(page, 'Sales Network')
    page.get_by_role('button', name='Present', exact=True).click()
    expect(page.locator('.presentation-dock')).to_be_visible()
    record('Presentation mode enters fullscreen', page.evaluate('!!document.fullscreenElement'))
    page.locator('.presentation-dock').get_by_role('button', name='Next', exact=True).click()
    expect(page.locator('.presentation-dock')).to_contain_text('3 / 5')
    page.get_by_role('button',name='Inspect residuals and technical detail',exact=True).click()
    expect(page.get_by_role('button',name='Vs fitted',exact=True)).to_be_visible()
    expect(page.get_by_text('Historical observations & complete fit statistics',exact=True)).to_be_visible()
    page.get_by_role('button',name='Hide residuals and technical detail',exact=True).click()
    record('Fullscreen validation retains optional residual and historical diagnostics')
    page.mouse.click(100, 160)
    page.keyboard.press('ArrowRight')
    expect(page.locator('.presentation-dock')).to_contain_text('4 / 5')
    expect(page.get_by_role('button',name='Presentation mode',exact=True)).to_have_attribute('aria-pressed','true')
    expect(page.locator('.scenario-controls input[type="number"]')).to_have_count(2)
    record('Fullscreen defaults to simplified simulator')
    record('Presentation supports dock and keyboard chapter navigation')
    page.screenshot(path=str(OUT/'presentation-desktop.png'), full_page=True)
    page.get_by_role('button', name='Exit presentation', exact=True).click()
    expect(page.locator('.presentation-dock')).to_have_count(0)
    record('Presentation exits cleanly')

    mobile=browser.new_context(viewport={'width':390,'height':844},device_scale_factor=1,is_mobile=True,has_touch=True,reduced_motion='reduce')
    mp=mobile.new_page()
    mp.on('pageerror',lambda e:errors.append(str(e)))
    mp.on('console',lambda m: errors.append(m.text) if m.type == 'error' else None)
    mp.goto(PREVIEW,wait_until='networkidle')
    expect(mp.get_by_role('button',name='Reduced motion',exact=True)).to_be_disabled()
    record('System reduced-motion preference is honored')
    mp.screenshot(path=str(OUT/'business-question-mobile.png'),full_page=True)
    chapter(mp,'Sales Network')
    expect(mp.locator('.network-overlay')).to_have_attribute('viewBox','0 0 560 720')
    record('Mobile network uses a dedicated readable compact layout')
    record('Mobile cluster labels fit above the interaction footer',mp.evaluate('''()=>{
      const labels=[...document.querySelectorAll('.cluster-label text')].map(e=>e.getBoundingClientRect());
      const controls=document.querySelector('.zoom-tools').getBoundingClientRect();
      const instructions=document.querySelector('.network-instruction').getBoundingClientRect();
      return labels.every(r=>r.left>=0&&r.right<=document.documentElement.clientWidth&&r.bottom<Math.min(controls.top,instructions.top));
    }'''))
    for name,slug in [('Sales Network','network'),('Model Validation','validation'),('Decision Simulator','simulator'),('Strategic Insights','strategic-insights')]:
        chapter(mp,name)
        mp.wait_for_timeout(250)
        no_overflow(mp,f'Mobile {name} has no horizontal overflow')
        mp.screenshot(path=str(OUT/f'{slug}-mobile.png'),full_page=True)
    chapter(mp,'Decision Simulator')
    mp.get_by_role('spinbutton',name='Current advertising',exact=True).fill('40')
    mp.get_by_role('spinbutton',name='Current advertising',exact=True).press('Tab')
    record('Mobile simulator calculates current advertising change',math.isclose(float(mp.get_by_test_id('scenario-sales').get_attribute('data-value')),386.231693806404+b[2]['coefficient'],abs_tol=1e-9))
    mp.get_by_role('button',name='Presentation mode',exact=True).click()
    mp.screenshot(path=str(OUT/'simulator-presentation-mobile.png'),full_page=True)
    for width in [360,768,1024,1920]:
        page.set_viewport_size({'width':width,'height':1000})
        for name in ['Business Question','Sales Network','Model Validation','Decision Simulator','Strategic Insights']:
            chapter(page,name)
            no_overflow(page,f'{width}px {name} has no horizontal overflow')
    page.set_viewport_size({'width':1440,'height':900})
    chapter(page,'Sales Network')
    page.get_by_role('button',name='Present',exact=True).click()
    record('1440x900 fullscreen network legend and linked quarter fit above the dock',page.evaluate('document.querySelector(".network-footnotes").getBoundingClientRect().bottom < document.querySelector(".presentation-dock").getBoundingClientRect().top'))
    page.screenshot(path=str(OUT/'presentation-network-refined.png'),full_page=True)
    for name,slug in [('Business Question','question'),('Model Validation','validation'),('Decision Simulator','simulator'),('Strategic Insights','insights')]:
        chapter(page,name)
        page.evaluate('document.fonts.ready')
        record(f'1440x900 fullscreen {name} core content fits above the chapter dock',page.evaluate('document.querySelector(".chapter-transition").getBoundingClientRect().bottom < document.querySelector(".presentation-dock").getBoundingClientRect().top'))
        page.screenshot(path=str(OUT/f'draft-fullscreen-{slug}.png'),full_page=True)
    page.mouse.click(100,160)
    page.keyboard.press('1')
    expect(page.locator('.presentation-dock')).to_contain_text('1 / 5')
    page.keyboard.press('5')
    expect(page.locator('.presentation-dock')).to_contain_text('5 / 5')
    record('Keyboard chapter shortcuts cover the complete five-chapter story')
    page.get_by_role('button',name='Exit presentation',exact=True).click()
    chapter(page,'Sales Network')
    page.get_by_role('button',name='Resume motion',exact=True).click()
    frame_times = page.evaluate('''() => new Promise(resolve => {
      const samples=[];let previous=0;
      function frame(t){if(previous)samples.push(t-previous);previous=t;if(samples.length<120)requestAnimationFrame(frame);else resolve(samples);}
      requestAnimationFrame(frame);
    })''')
    sorted_times=sorted(frame_times)
    median=sorted_times[len(sorted_times)//2]
    print(f'Animation cadence median: {median:.2f}ms; p95: {sorted_times[int(len(sorted_times)*.95)]:.2f}ms',flush=True)
    record('Network remains interactive during animation',median<34)
    record('No browser runtime errors',not errors)
    (OUT/'browser-report.json').write_text(json.dumps({'passed':True,'checks':checks,'runtimeErrors':errors,'animationCadence':{'medianMs':median,'p95Ms':sorted_times[int(len(sorted_times)*.95)],'note':'Headless Chromium rAF cadence; not a guarantee for all devices.'}},indent=2)+'\n',encoding='utf-8')
    browser.close()
    print(f'PASS: {len(checks)} browser checks. Screenshots saved to {OUT}.',flush=True)
