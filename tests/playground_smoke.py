"""Run with Vite on port 5173, Python Playwright, and /usr/bin/chromium."""
import json
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':950})
    errors=[]
    page.on('pageerror',lambda e: errors.append(str(e)))
    page.goto('http://127.0.0.1:5173/',wait_until='networkidle')
    page.clock.install()
    assert page.locator('.pg-game-card').count()==6
    page.get_by_role('button',name='기억력',exact=True).click()
    assert page.locator('.pg-game-card').count()==1
    page.get_by_role('button',name='✳ 전체 놀이',exact=True).click()
    page.get_by_role('button',name='선물 받기 +20',exact=True).click()
    assert page.get_by_label('별사탕 20개',exact=True).is_visible()
    page.reload(wait_until='networkidle')
    assert page.get_by_role('button',name='✓ 받았어요',exact=True).is_disabled()
    page.get_by_role('button',name='효과음 켜기',exact=True).click()
    assert page.get_by_role('button',name='효과음 끄기',exact=True).is_visible()
    page.get_by_role('button',name='효과음 끄기',exact=True).click()
    print('PASS: category filters, daily gift persisted, sound toggle')

    names=['냠냠 간식 바구니','퐁퐁 구름 점프','콩닥 택배 가게','도란도란 짝꿍 찾기','느긋느긋 낚시터','꼬물꼬물 두더지']
    for i,name in enumerate(names):
        page.get_by_role('button',name=f'{name} 놀이 선택',exact=True).click()
        page.get_by_role('button',name='준비됐어요, 시작! ▷',exact=True).click()
        page.clock.run_for(50)
        assert page.get_by_role('heading',name=name,exact=True).is_visible()
        if i==0:
            scene=page.locator('.pg-snack-field').bounding_box()
            page.mouse.move(scene['x']+30,scene['y']+100)
            assert float(page.locator('.pg-basket-player').evaluate('(e)=>parseFloat(e.style.left)'))<20
            page.keyboard.press('ArrowRight')
            page.clock.run_for(100)
            page.get_by_role('button',name='게임 일시정지',exact=True).click()
            timer=page.get_by_role('progressbar').get_attribute('aria-valuenow')
            page.clock.run_for(5000)
            assert page.get_by_role('progressbar').get_attribute('aria-valuenow')==timer
            page.get_by_role('button',name='이어서 놀기 ▷',exact=True).click()
            page.evaluate("window.dispatchEvent(new Event('blur'))")
            page.get_by_role('dialog',name='일시정지',exact=True).wait_for()
            page.keyboard.press('Escape')
            assert page.get_by_role('dialog',name='일시정지',exact=True).count()==0
        elif i==1:
            page.get_by_role('button',name='퐁! 점프하기 ↑',exact=True).click()
            page.clock.run_for(50)
            assert page.get_by_test_id('score').inner_text().startswith('20')
        elif i==2:
            dest=page.locator('.pg-package small').inner_text().replace('TO. ','')
            page.locator('.pg-parcel-bins button').filter(has_text=dest).click()
            page.clock.run_for(180)
            assert page.get_by_test_id('score').inner_text().startswith('15')
        elif i==3:
            # Find pairs by actually turning cards; do not inspect hidden model state.
            cards=page.locator('.pg-memory-grid button')
            seen={}
            for index in range(12):
                if cards.nth(index).is_disabled(): continue
                cards.nth(index).click(); page.clock.run_for(20)
                value=cards.nth(index).inner_text().replace('✓','').strip()
                seen.setdefault(value,[]).append(index)
                if len(seen[value])==2:
                    earlier=seen[value][0]
                    if not cards.nth(earlier).is_disabled():
                        cards.nth(earlier).click(); page.clock.run_for(50)
                        break
                for other in range(12):
                    if other!=index and not cards.nth(other).is_disabled():
                        cards.nth(other).click(); page.clock.run_for(20)
                        value2=cards.nth(other).inner_text().replace('✓','').strip()
                        if other not in seen.setdefault(value2,[]):seen[value2].append(other)
                        break
                page.clock.run_for(850)
            assert page.locator('.pg-memory-grid button').count()==12
        elif i==4:
            button=page.get_by_role('button',name='꾹 눌러 낚시하기',exact=True)
            box=button.bounding_box();page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
            page.mouse.down();page.clock.run_for(880);page.mouse.up();page.clock.run_for(50)
            assert int(page.get_by_test_id('score').inner_text().replace('점',''))>=20
        elif i==5:
            page.clock.run_for(200)
            for _ in range(10):
                mole=page.get_by_role('button',name=r'두더지')
                target=page.locator('.pg-mole-body')
                if target.count():
                    target.locator('..').click();page.clock.run_for(30);break
                page.clock.run_for(1120)
            assert int(page.get_by_test_id('score').inner_text().replace('점',''))>=15
        page.screenshot(path=f'/tmp/mongle-game-{i}.png',full_page=True)
        page.clock.run_for(47000)
        page.get_by_role('region',name='게임 결과',exact=True).wait_for()
        before=json.loads(page.evaluate("localStorage.getItem('mongle_playground_v1')"))
        assert before['played']==i+1
        page.clock.run_for(2500)
        after=json.loads(page.evaluate("localStorage.getItem('mongle_playground_v1')"))
        assert before['coins']==after['coins'], 'duplicate round reward'
        if i==5:
            page.screenshot(path='/tmp/mongle-result.png',full_page=True)
            page.get_by_role('button',name='한 판 더 놀기 ↻',exact=True).click()
            page.clock.run_for(30)
            assert page.get_by_role('region',name='게임 결과',exact=True).count()==0
            assert page.get_by_test_id('score').inner_text().startswith('0')
            page.get_by_role('button',name='게임 일시정지',exact=True).click()
            page.get_by_role('button',name='이번 판 그만하고 놀이터로',exact=True).click()
        else:
            page.get_by_role('button',name='다른 놀이 고르기 →',exact=True).click()
        print('PASS:',name,'interaction, round finish, single reward')

    page.get_by_role('button',name='몽글이 꾸미기',exact=True).click()
    before=json.loads(page.evaluate("localStorage.getItem('mongle_playground_v1')"))
    page.get_by_role('button',name='✦ 30개로 데려오기',exact=True).click()
    after=json.loads(page.evaluate("localStorage.getItem('mongle_playground_v1')"))
    assert after['skin']=='berry' and after['coins']==before['coins']-30
    page.reload(wait_until='networkidle')
    assert '#ffc9d3' in page.locator('.pg-brand svg').inner_html()
    page.get_by_role('button',name='나의 기록',exact=True).click()
    assert page.locator('.pg-record-grid button').count()==6
    page.get_by_role('button',name='몽글이 게임 타운 홈',exact=True).click()
    for width in [320,375,768,1280]:
        page.set_viewport_size({'width':width,'height':850})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'overflow at {width}'
    assert not errors,errors
    print('PASS: cosmetic purchase and reload, six record cards, responsive widths 320–1280, no uncaught errors')
    browser.close()
