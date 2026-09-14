const version = new URLSearchParams(location.search).get('version') === 'before' ? 'before' : 'after';
const gl = await import(`./vendor/${version}/maplibre-gl-dev.mjs`);
const css = document.createElement('link');
css.rel = 'stylesheet';
css.href = `./vendor/${version}/maplibre-gl.css`;
document.head.append(css);
let map;
let syncing = false;
let frozenAt;
let renderCount = 0;
let lastError;
let firstPixels;
let finalPixels;

/** Rejects stalled network or render operations instead of leaving the controls disabled indefinitely. */
function timeout(promise) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(lastError || 'Map loading did not finish within 30 seconds')), 30000);
    })]).finally(() => clearTimeout(timer));
}

function createMap(zoom = 4, fadeDuration = 300) {
    gl.restoreNow();
    map?.remove();
    renderCount = 0;
    lastError = null;
    map = new gl.Map({
        container: 'map', center: [139.75, 35.68], zoom,
        preserveDrawingBuffer: true,
        style: {version: 8, sources: {osm: {
            type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256, maxzoom: 19,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors'
        }}, layers: [{id: 'osm', type: 'raster', source: 'osm', paint: {'raster-fade-duration': fadeDuration}}]}
    });
    map.on('error', event => {lastError = event.error.message;});
    map.on('render', () => renderCount++);
    map.on('move', () => {
        if (syncing) return;
        parent.postMessage({type: 'camera', version, center: map.getCenter().toArray(), zoom: map.getZoom(), bearing: map.getBearing(), pitch: map.getPitch()}, location.origin);
    });
    return timeout(map.once('idle'));
}

/** Samples the actual WebGL output; transparent pixels expose the checkerboard behind the canvas. */
function measure() {
    const canvas = map.getCanvas();
    const context = canvas.getContext('webgl2');
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    context.readPixels(0, 0, canvas.width, canvas.height, context.RGBA, context.UNSIGNED_BYTE, pixels);
    let visible = 0;
    let changed = 0;
    if (firstPixels?.length === pixels.length) {
        for (let i = 0; i < pixels.length; i += 4) {
            if (Math.abs(pixels[i] - firstPixels[i]) + Math.abs(pixels[i + 1] - firstPixels[i + 1]) + Math.abs(pixels[i + 2] - firstPixels[i + 2]) > 12) changed++;
        }
    }
    finalPixels = pixels;
    for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) visible++;
    return {coverage: 100 * visible / (pixels.length / 4), changed: 100 * changed / (pixels.length / 4), renders: renderCount};
}

async function frame() {
    const next = map.once('render');
    map.triggerRepaint();
    await timeout(next);
}

/** Freezing the public clock makes loading and the first draw share the same fade timestamp. */
async function startFade() {
    frozenAt = gl.now();
    gl.setNow(frozenAt);
    map.setZoom(5);
    await timeout(new Promise(resolve => {
        function onRender() {
            if (!map.isSourceLoaded('osm')) return;
            map.off('render', onRender);
            resolve();
        }
        map.on('render', onRender);
    }));
    firstPixels = null;
    const result = measure();
    firstPixels = finalPixels;
    return result;
}

window.demo = {
    reset: createMap,
    startFade,
    async finishFade() {
        gl.setNow(frozenAt + 400);
        await frame();
        await frame();
        return measure();
    },
    async compareReference() {
        const actual = finalPixels;
        await createMap(5, 0);
        firstPixels = actual;
        return measure();
    },
    restore() {gl.restoreNow();},
    camera(camera) {
        syncing = true;
        try {map.jumpTo(camera);} finally {syncing = false;}
    }
};
try {
    await createMap();
    parent.postMessage({type: 'ready', version}, location.origin);
} catch (error) {
    parent.postMessage({type: 'failure', message: error.message}, location.origin);
}
