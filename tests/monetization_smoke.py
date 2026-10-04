"""Browser contract tests with a simulated Google SDK. Never requests live ads."""
import json
from playwright.sync_api import sync_playwright

CONFIG="""export const monetizationConfig={audience:'general',measurementId:'G-TEST12345',rewardedUnit:'/123/test'};export function capabilities(){return {analytics:true,rewarded:true}};"""
GPT="""
const queue=window.googletag.cmd;
const listeners=new Map();let slot;
window.__gptTest={visible:0,destroyed:0,mode:'ready',emit(name,extra={}){for(const fn of listeners.get(name)||[])fn({slot,...extra});}};
window.googletag={apiReady:true,cmd:{push:fn=>fn()},enums:{OutOfPageFormat:{REWARDED:1}},
 pubads(){return {setPrivacySettings(){},addEventListener(n,fn){const a=listeners.get(n)||[];a.push(fn);listeners.set(n,a)},removeEventListener(n,fn){listeners.set(n,(listeners.get(n)||[]).filter(f=>f!==fn))}}},
 defineOutOfPageSlot(){slot={addService(){return slot}};return slot},enableServices(){},
 display(){queueMicrotask(()=>{if(window.__gptTest.mode==='empty')window.__gptTest.emit('slotRenderEnded',{isEmpty:true});else window.__gptTest.emit('rewardedSlotReady',{makeRewardedVisible(){window.__gptTest.visible++;return true;}})})},
 destroySlots(){window.__gptTest.destroyed++}
};for(const fn of queue)fn();
"""

def finish_cloud(page):
    for _ in range(100):
        if page.get_by_role('region',name='게임 결과',exact=True).count(): return
        position=page.locator('.pg-moving-cloud').evaluate('(e)=>parseFloat(e.style.left)')
        if position<36 or position>64:
            page.get_by_role('button',name='퐁! 점프하기 ↑',exact=True).click()
            page.clock.run_for(450)
        else:page.clock.run_for(100)
    raise AssertionError('Cloud round did not finish')

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':375,'height':900})
    counts={'ga':0,'gpt':0};errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.route('**/src/monetization/config.js*',lambda r:r.fulfill(content_type='text/javascript',body=CONFIG))
    def ga(route):
        counts['ga']+=1;route.fulfill(content_type='text/javascript',body='/* simulated GA loader */')
    def gpt(route):
        counts['gpt']+=1;route.fulfill(content_type='text/javascript',body=GPT)
    page.route('https://www.googletagmanager.com/**',ga)
    page.route('https://securepubads.g.doubleclick.net/**',gpt)
    page.goto('http://127.0.0.1:5173/',wait_until='networkidle')
    page.clock.install()
    assert counts=={'ga':0,'gpt':0}
    page.get_by_role('button',name='필수만 사용',exact=True).click()
    page.get_by_role('button',name='퐁퐁 구름 점프 놀이 선택',exact=True).click()
    page.get_by_role('button',name='준비됐어요, 시작! ▷',exact=True).click()
    page.clock.run_for(100)
    finish_cloud(page)
    before=json.loads(page.evaluate("localStorage.getItem('mongle_playground_v1')"))
    assert counts=={'ga':0,'gpt':0}
    page.get_by_role('button',name='▷ 광고 보고 별사탕 2배',exact=True).click()
    dialog=page.get_by_role('dialog',name='개인정보와 선택 설정',exact=True)
    assert dialog.is_visible() and counts=={'ga':0,'gpt':0}
    dialog.get_by_role('checkbox').nth(0).check();dialog.get_by_role('checkbox').nth(1).check()
    dialog.get_by_role('button',name='선택 저장',exact=True).click()
    page.clock.run_for(100)
    assert counts['ga']==1 and counts['gpt']==0
    assert page.evaluate("(window.dataLayer||[]).filter(e=>e[1]==='game_start').length")==0
    print('PASS: no external SDK before consent, independent choices, no replay of pre-consent analytics')

    page.get_by_role('button',name='▷ 광고 보고 별사탕 2배',exact=True).click()
    page.get_by_role('button',name='광고 시청하고',exact=False).wait_for()
    assert counts['gpt']==1
    page.get_by_role('button',name='광고 시청하고',exact=False).click()
    page.evaluate("window.__gptTest.emit('rewardedSlotClosed')")
    page.get_by_text('광고를 끝까지 보지 않아 추가 보상은 지급되지 않았어요.',exact=False).wait_for()
    assert json.loads(page.evaluate("localStorage.getItem('mongle_playground_v1')"))['coins']==before['coins']
    print('PASS: early close never earns a bonus')

    page.get_by_role('button',name='▷ 광고 보고 별사탕 2배',exact=True).click()
    page.get_by_role('button',name='광고 시청하고',exact=False).click()
    page.evaluate("window.__gptTest.emit('rewardedSlotGranted');window.__gptTest.emit('rewardedSlotGranted');window.__gptTest.emit('rewardedSlotClosed')")
    page.get_by_role('button',name='✓ 추가 별사탕 받음',exact=True).wait_for()
    after=json.loads(page.evaluate("localStorage.getItem('mongle_playground_v1')"))
    assert after['coins']==before['coins']*2
    assert after['rounds'][0]['adBonusClaimed'] is True
    assert page.get_by_role('button',name='✓ 추가 별사탕 받음',exact=True).is_disabled()
    page.screenshot(path='/tmp/mongle-reward-verified.png',full_page=True)
    print('PASS: provider grant + close pays once, duplicate grant is harmless')

    page.get_by_role('button',name='한 판 더 놀기 ↻',exact=True).click();page.clock.run_for(100)
    finish_cloud(page)
    before_empty=json.loads(page.evaluate("localStorage.getItem('mongle_playground_v1')"))['coins']
    page.evaluate("window.__gptTest.mode='empty'")
    page.get_by_role('button',name='▷ 광고 보고 별사탕 2배',exact=True).click()
    page.get_by_text('지금 볼 수 있는 광고가 없어요.',exact=False).wait_for()
    assert json.loads(page.evaluate("localStorage.getItem('mongle_playground_v1')"))['coins']==before_empty
    assert page.get_by_role('button',name='한 판 더 놀기 ↻',exact=True).is_enabled()
    assert page.evaluate("(window.dataLayer||[]).filter(e=>e[1]==='game_retry').length")==1
    print('PASS: no-fill keeps game available, retry telemetry emitted once')

    page.get_by_role('button',name='다른 놀이 고르기 →',exact=True).click()
    page.get_by_role('button',name='개인정보·선택 설정',exact=True).click()
    page.get_by_role('dialog').get_by_role('button',name='필수만 사용',exact=True).click()
    n=page.evaluate("window.dataLayer.filter(e=>e[0]==='event').length")
    page.get_by_role('button',name='콩닥 택배 가게 놀이 선택',exact=True).click()
    page.get_by_role('button',name='준비됐어요, 시작! ▷',exact=True).click();page.clock.run_for(100)
    assert page.evaluate("window['ga-disable-G-TEST12345']") is True
    assert page.evaluate("window.dataLayer.filter(e=>e[0]==='event').length")==n
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors,errors
    print('PASS: withdrawal stops analytics; mobile fits; all SDK activity was simulated, not live inventory')
    browser.close()
