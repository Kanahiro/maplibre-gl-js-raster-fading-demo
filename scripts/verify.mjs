import {createRequire} from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve(process.env.MAPLIBRE_REPO || '../maplibre-gl-js', 'package.json'));
const {default: puppeteer} = await import(require.resolve('puppeteer'));
const browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
try {
    const page = await browser.newPage();
    await page.setViewport({width: 1440, height: 1000, deviceScaleFactor: 1});
    page.on('pageerror', error => console.error(error));
    await page.goto('http://127.0.0.1:4173/');
    await page.waitForFunction(() => !document.querySelector('#run').disabled, {timeout: 60000});
    await page.click('#run');
    await page.waitForFunction(() => window.demoResult, {timeout: 60000});
    const result = await page.evaluate(() => window.demoResult);
    console.log(JSON.stringify(result, null, 2));
    await page.screenshot({path: '/tmp/raster-fading-demo-verification.png', fullPage: true});
    if (!(result.final[0].changed < 0.1 && result.final[1].changed > 1)) throw new Error('Expected stalled rendering only before the fix');
    const reference = await page.evaluate(() => Promise.all([...document.querySelectorAll('iframe')].map(frame => frame.contentWindow.demo.compareReference())));
    console.log('Difference from fresh zoom-5 map without fading:', reference);
    if (!(reference[0].changed > 1 && reference[1].changed < 0.1)) throw new Error('Fixed output must match the unfaded reference');
    await page.click('#reset');
    await page.waitForFunction(() => !document.querySelector('#run').disabled);
} finally {
    await browser.close();
}
