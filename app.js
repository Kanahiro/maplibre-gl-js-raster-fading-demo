const frames = [...document.querySelectorAll('iframe')];
const run = document.querySelector('#run');
const reset = document.querySelector('#reset');
const status = document.querySelector('#status');
const ready = new Set();
let busy = true;
const builds = await fetch('./vendor/builds.json').then(response => response.json());
for (const version of ['before', 'after']) document.querySelector(`#${version}-ref`).textContent = builds[version].commit.slice(0, 9);

window.addEventListener('message', event => {
    if (event.origin !== location.origin || !frames.some(frame => frame.contentWindow === event.source)) return;
    const message = event.data;
    if (message.type === 'ready') {
        ready.add(message.version);
        if (ready.size === 2) {setBusy(false); status.textContent = 'Ready to compare';}
    }
    if (message.type === 'failure') status.textContent = `Error: ${message.message}`;
    if (message.type !== 'camera' || busy) return;
    for (const frame of frames) if (frame.contentWindow !== event.source) frame.contentWindow.demo.camera(message);
});

function setBusy(value) {
    busy = value;
    run.disabled = value;
    reset.disabled = value;
    for (const frame of frames) frame.inert = value;
}

async function resetMaps() {
    await Promise.all(frames.map(frame => frame.contentWindow.demo.reset()));
}

run.onclick = async () => {
    setBusy(true);
    status.textContent = 'Loading → Zooming with a frozen clock → Comparing at 400 ms…';
    try {
        await resetMaps();
        const first = await Promise.all(frames.map(frame => frame.contentWindow.demo.startFade()));
        const final = await Promise.all(frames.map(frame => frame.contentWindow.demo.finishFade()));
        window.demoResult = {builds, first, final};
        status.textContent = final[0].changed < 0.1 && final[1].changed > 1 && final[1].coverage > 99
            ? 'Before: stalled on coarse parent tiles. After: updated to detailed tiles.'
            : 'Results displayed. Run again if no difference is visible.';
    } catch (error) {
        status.textContent = `Verification failed: ${error.message}`;
    } finally {
        for (const frame of frames) frame.contentWindow.demo.restore();
        setBusy(false);
    }
};
reset.onclick = async () => {
    setBusy(true);
    try {
        await resetMaps();
        status.textContent = 'Ready to compare';
    } catch (error) {status.textContent = `Error: ${error.message}`;}
    finally {setBusy(false);}
};
