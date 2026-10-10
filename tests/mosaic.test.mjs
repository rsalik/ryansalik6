// @ts-nocheck — These deliberately partial browser shims exercise the renderer without a DOM.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createMosaicRenderer } from '../src/lib/mosaic/renderer.ts';

const photo = (id) => ({
  id: String(id),
  title: `Photograph ${id}`,
  src: `https://photos.test/${id}/lg.jpg`,
  thumbnail: `https://photos.test/${id}/md.jpg`,
  srcset: `https://photos.test/${id}/sm.jpg 480w, https://photos.test/${id}/md.jpg 960w, https://photos.test/${id}/lg.jpg 1600w, https://photos.test/${id}/xl.jpg 2560w`,
  fullSrc: `https://photos.test/${id}/full.jpg`
});

function browser(
  t,
  { reduced = false, held = () => false, failed = () => false, decodeHeld = () => false } = {}
) {
  const originals = new Map();
  const install = (key, value) => {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  };
  let nextId = 0;
  let timestamp = 100;
  let intersection;
  let resize;
  const frames = new Map();
  const events = new Map();
  const requests = [];
  const pending = new Map();
  const pendingDecode = new Map();
  const draws = [];
  const states = [];
  const changes = [];
  const bounds = { width: 1200, height: 800 };
  let clears = 0;
  const motion = {
    matches: reduced,
    addEventListener(_, fn) {
      this.change = fn;
    },
    removeEventListener() {}
  };
  const context = {
    globalAlpha: 1,
    drawImage(...args) {
      draws.push({ time: timestamp, alpha: this.globalAlpha, args });
    },
    fillRect() {
      clears++;
    },
    setTransform() {},
    strokeRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    stroke() {},
    createRadialGradient() {
      return { addColorStop() {} };
    }
  };
  install('requestAnimationFrame', (fn) => {
    frames.set(++nextId, fn);
    return nextId;
  });
  install('cancelAnimationFrame', (id) => frames.delete(id));
  install('window', { devicePixelRatio: 3, matchMedia: () => motion, setTimeout, clearTimeout });
  install('navigator', {});
  install('document', {
    hidden: false,
    addEventListener(name, fn) {
      events.set(name, fn);
    },
    removeEventListener(name) {
      events.delete(name);
    }
  });
  install(
    'ResizeObserver',
    class {
      constructor(fn) {
        resize = fn;
      }
      observe() {}
      disconnect() {}
    }
  );
  install(
    'IntersectionObserver',
    class {
      constructor(fn) {
        intersection = fn;
      }
      observe() {}
      disconnect() {}
    }
  );
  install(
    'Image',
    class {
      get src() {
        return this.url;
      }
      decode() {
        if (decodeHeld(this.url))
          return new Promise((resolve) => pendingDecode.set(this.url, resolve));
        return Promise.resolve();
      }
      set src(url) {
        this.url = url;
        if (!url) return;
        requests.push(url);
        const finish = () => {
          this.naturalWidth = url.includes('/full.') ? 6000 : url.includes('/xl.') ? 2560 : 960;
          this.naturalHeight = (this.naturalWidth * 2) / 3;
          if (failed(url)) this.onerror?.();
          else this.onload?.();
        };
        if (held(url)) pending.set(url, finish);
        else queueMicrotask(finish);
      }
    }
  );
  const canvas = { dataset: {}, getContext: () => context, getBoundingClientRect: () => bounds };
  const renderer = createMosaicRenderer(
    canvas,
    (image, index) => changes.push({ image, index }),
    () => {},
    (state) => states.push(state)
  );
  const flush = async () => {
    for (let i = 0; i < 30; i++) await Promise.resolve();
  };
  const advance = (duration) => {
    for (let elapsed = 0; elapsed < duration; elapsed += 16) {
      timestamp += 16;
      const scheduled = [...frames.values()];
      frames.clear();
      for (const fn of scheduled) fn(timestamp);
    }
  };
  t.after(async () => {
    renderer.destroy();
    await flush();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  return {
    renderer,
    canvas,
    frames,
    draws,
    requests,
    states,
    changes,
    bounds,
    events,
    motion,
    flush,
    advance,
    clears: () => clears,
    resize: () => resize(),
    visible: (isIntersecting) => intersection([{ isIntersecting }]),
    decode: (url) => {
      pendingDecode.get(url)?.();
      pendingDecode.delete(url);
    },
    release: (url) => {
      pending.get(url)?.();
      pending.delete(url);
    }
  };
}

function fullDraw(browser, id) {
  const draw = browser.draws.findLast(
    ({ args }) =>
      args[0].url.includes(`/${id}/`) &&
      args[5] === 0 &&
      args[6] === 0 &&
      args[7] === browser.bounds.width &&
      args[8] === browser.bounds.height
  );
  assert(draw, `photograph ${id} has been painted as the full canvas`);
  return draw;
}

function landmark(draw, x = 0.5, y = 0.5) {
  const [image, sx, sy, sw, sh, dx, dy, dw, dh] = draw.args;
  return [
    ((image.naturalWidth * x - sx) / sw) * dw + dx,
    ((image.naturalHeight * y - sy) / sh) * dh + dy
  ];
}

function assertUniformMovement(samples) {
  for (const point of [
    [0.25, 0.25],
    [0.5, 0.5],
    [0.75, 0.75]
  ]) {
    const velocities = samples.slice(1).map((draw, index) => {
      const previous = samples[index];
      const from = landmark(previous, ...point);
      return landmark(draw, ...point).map(
        (value, axis) => (value - from[axis]) / (draw.time - previous.time)
      );
    });
    for (const axis of [0, 1]) {
      const expected = velocities[0][axis];
      assert(Math.abs(expected) > 0.00001, 'the landmark must keep moving');
      for (const velocity of velocities) {
        assert(
          expected * velocity[axis] > 0,
          'a landmark must never reverse direction within one photograph'
        );
        assert(
          Math.abs(velocity[axis] - expected) < Math.abs(expected) * 0.03 + 0.000001,
          'landmark speed should remain uniform throughout the photograph'
        );
      }
    }
  }
}

test('progressively upgrades the current photo in place and preloads a bounded lookahead', async (t) => {
  const b = browser(t, { held: (url) => /\/(xl|full)\./.test(url) });
  const collection = [photo(0), photo(1), photo(2), photo(3)];
  b.renderer.setPhotos(collection);
  await b.flush();
  assert.equal(b.draws.at(-1).args[0].url, collection[0].thumbnail);
  assert(b.requests.includes(collection[1].thumbnail));
  assert(b.requests.includes(collection[2].thumbnail));
  assert(!b.requests.includes(collection[3].thumbnail));
  assert(!b.requests.some((url) => url.includes('/full.')));
  b.release('https://photos.test/0/xl.jpg');
  await b.flush();
  assert.equal(b.draws.at(-1).args[0].url, 'https://photos.test/0/xl.jpg');
  b.release(collection[0].fullSrc);
  await b.flush();
  assert.equal(b.draws.at(-1).args[0].url, collection[0].fullSrc);
  assert.equal(b.canvas.dataset.imageSrc, collection[0].fullSrc);
  assert.equal(b.canvas.dataset.imageWidth, '6000');
  assert.equal(
    b.changes.length,
    1,
    'sharpness changes must not restart the photo or its transition'
  );
  assert.equal(
    b.draws.at(-1).args[3],
    6000,
    'matching aspect ratio starts with no additional crop'
  );
  assert(
    !b.requests.includes(collection[1].fullSrc),
    'future full-resolution files are not downloaded'
  );
});

test('the full-resolution bitmap is not swapped into the canvas before decoding finishes', async (t) => {
  const b = browser(t, { decodeHeld: (url) => url.includes('/full.') });
  b.renderer.setPhotos([photo(0)]);
  await b.flush();
  assert.equal(b.canvas.dataset.imageSrc, 'https://photos.test/0/xl.jpg');
  b.advance(3504);
  const before = fullDraw(b, 0);
  const beforePoint = landmark(before);
  b.decode(photo(0).fullSrc);
  await b.flush();
  assert.equal(b.canvas.dataset.imageSrc, photo(0).fullSrc);
  assert.equal(b.changes.length, 1);
  const after = fullDraw(b, 0);
  assert.equal(after.time, before.time, 'decoding alone must not advance the animation clock');
  landmark(after).forEach((value, axis) =>
    assert(
      Math.abs(value - beforePoint[axis]) < 0.00001,
      'an in-flight resolution upgrade must preserve the current composition'
    )
  );
  assert(
    Math.abs(
      after.args[3] / after.args[0].naturalWidth - before.args[3] / before.args[0].naturalWidth
    ) < 0.00001,
    'an in-flight resolution upgrade must preserve zoom'
  );
});

test('the clicked cell starts the next photo wave, and pause/visibility stop idle rendering', async (t) => {
  const b = browser(t);
  b.bounds.height = 700;
  b.resize();
  b.renderer.setPhotos([photo(0), photo(1), photo(2)]);
  await b.flush();
  b.renderer.next({ x: 10, y: 10 });
  await b.flush();
  assert.equal(b.changes.at(-1).index, 1);
  assert(
    !b.requests.includes(photo(1).fullSrc),
    'the incoming full image waits until the outgoing full image is released'
  );
  b.draws.length = 0;
  b.advance(220);
  const incoming = b.draws.filter(({ args }) => args[0].url.includes('/1/'));
  assert(incoming.length > 0);
  assert(
    incoming.every(({ args }) => args[5] < 600),
    'far-side cells must wait for the wave'
  );
  b.advance(1400);
  await b.flush();
  assert(b.requests.includes(photo(1).fullSrc));
  b.renderer.setPaused(true);
  b.advance(100);
  assert.equal(b.frames.size, 0);
  b.renderer.point({ x: 200, y: 200 });
  b.advance(1200);
  assert.equal(b.frames.size, 0, 'hover spotlight settles without a permanent render loop');
  b.renderer.setPaused(false);
  b.visible(false);
  assert.equal(b.frames.size, 0);
  b.visible(true);
  assert(b.frames.size > 0);
});

test('reduced motion keeps manual navigation and disables automatic motion', async (t) => {
  const b = browser(t, { reduced: true });
  b.renderer.setPhotos([photo(0), photo(1)]);
  await b.flush();
  b.advance(100);
  assert.equal(b.frames.size, 0);
  b.renderer.next();
  await b.flush();
  b.advance(100);
  assert.equal(b.changes.at(-1).index, 1);
  assert.equal(b.frames.size, 0);
  assert.equal(b.draws.at(-1).args[3], 6000);
});

test('empty collections clear stale imagery and cannot be repopulated by an old request', async (t) => {
  const b = browser(t, { held: (url) => url.includes('/pending/') });
  b.renderer.setPhotos([photo(0)]);
  await b.flush();
  b.renderer.setPhotos([photo('pending')]);
  const before = b.clears();
  b.renderer.setPhotos([]);
  assert(b.clears() > before);
  assert.deepEqual(b.states.at(-1), {
    kind: 'empty',
    message: 'No photographs in this collection yet.',
    hasPhoto: false
  });
  assert.equal(b.canvas.dataset.imageSrc, undefined);
  b.release(photo('pending').thumbnail);
  await b.flush();
  b.advance(100);
  assert.equal(b.changes.length, 1);
  assert.equal(b.frames.size, 0);
});

test('initial failure is accessible and retryable, while failed upgrades preserve a valid preview', async (t) => {
  let offline = true;
  const b = browser(t, { failed: (url) => offline || /\/(xl|full)\./.test(url) });
  b.renderer.setPhotos([photo(0)]);
  await b.flush();
  assert.equal(b.states.at(-1).kind, 'error');
  assert.equal(b.states.at(-1).hasPhoto, false);
  offline = false;
  b.renderer.next();
  await b.flush();
  assert.equal(b.states.at(-1).kind, 'ready');
  assert.equal(b.draws.at(-1).args[0].url, photo(0).thumbnail);
});

test('a failed next photo retains the displayed photo and reports the problem', async (t) => {
  const b = browser(t, { failed: (url) => url.includes('/1/') });
  b.renderer.setPhotos([photo(0), photo(1)]);
  await b.flush();
  b.renderer.next();
  await b.flush();
  assert.equal(b.changes.length, 1);
  assert.equal(b.states.at(-1).kind, 'error');
  assert.equal(b.states.at(-1).hasPhoto, true);
  assert.equal(b.draws.at(-1).args[0].url, photo(0).fullSrc);
});

test('resize redraws the full-resolution photo and cleanup removes scheduled work', async (t) => {
  const b = browser(t);
  b.renderer.setPhotos([photo(0)]);
  await b.flush();
  b.advance(10_000);
  const earlierWidth = fullDraw(b, 0).args[3];
  b.advance(4000);
  assert(
    fullDraw(b, 0).args[3] < earlierWidth,
    'a single photograph continues moving beyond one automatic hold'
  );
  assert(b.frames.size > 0, 'a visible unpaused photograph keeps its animation clock running');
  const loaded = b.requests.length;
  b.bounds.width = 400;
  b.bounds.height = 700;
  b.resize();
  assert.equal(b.canvas.width, 800, 'device pixel ratio is capped at two');
  assert.equal(b.draws.at(-1).args[7], 400);
  assert.equal(b.draws.at(-1).args[8], 700);
  assert.equal(b.requests.length, loaded, 'a layout resize never discards the sharp image');
  b.renderer.destroy();
  assert.equal(b.frames.size, 0);
  assert.equal(b.events.size, 0);
});

test('restrained photo motion pauses exactly and keeps portrait crops inside the image', async (t) => {
  const b = browser(t);
  b.renderer.setPhotos([photo(0)]);
  await b.flush();
  b.advance(4400);
  const halfwayWidth = b.draws.at(-1).args[3] / 6000;
  assert(
    halfwayWidth > 0.984 && halfwayWidth < 0.991,
    'the first half-hold should zoom gently without the earlier aggressive crop'
  );
  b.renderer.setPaused(true);
  b.advance(32);
  const frozen = b.draws.at(-1).args.slice(1, 5);
  b.advance(5000);
  assert.deepEqual(b.draws.at(-1).args.slice(1, 5), frozen);
  b.bounds.width = 390;
  b.bounds.height = 780;
  b.resize();
  b.renderer.setPaused(false);
  b.advance(5000);
  for (const { args } of b.draws) {
    const [image, x, y, width, height] = args;
    assert(x >= -0.001 && y >= -0.001);
    assert(x + width <= image.naturalWidth + 0.001);
    assert(y + height <= image.naturalHeight + 0.001);
  }
  assert(b.frames.size > 0);
});

test('fixed landmarks move uniformly without reversing on even or odd photographs', async (t) => {
  const b = browser(t);
  b.renderer.setPhotos([photo(0), photo(1)]);
  await b.flush();
  const even = [];
  for (let sample = 0; sample < 8; sample++) {
    b.advance(960);
    even.push(fullDraw(b, 0));
  }
  assertUniformMovement(even);
  b.renderer.next();
  await b.flush();
  b.advance(1280);
  await b.flush();
  const odd = [fullDraw(b, 1)];
  for (let sample = 0; sample < 8; sample++) {
    b.advance(960);
    odd.push(fullDraw(b, 1));
  }
  assertUniformMovement(odd);
  const evenDirection = landmark(even.at(-1))[0] - landmark(even[0])[0];
  const oddDirection = landmark(odd.at(-1))[0] - landmark(odd[0])[0];
  assert(
    evenDirection * oddDirection < 0,
    'direction may alternate between photographs, never during one photograph'
  );
});

test('motion continues while the next image is delayed and throughout the outgoing mosaic wave', async (t) => {
  const b = browser(t, { held: (url) => url.includes('/1/') });
  b.renderer.setPhotos([photo(0), photo(1)]);
  await b.flush();
  b.advance(9200);
  await b.flush();
  const delayed = [fullDraw(b, 0)];
  for (let sample = 0; sample < 3; sample++) {
    b.advance(960);
    delayed.push(fullDraw(b, 0));
  }
  assert.equal(b.changes.length, 1, 'the unavailable next photo has not replaced the current one');
  assertUniformMovement(delayed);
  b.release(photo(1).thumbnail);
  await b.flush();
  assert.equal(b.changes.at(-1).index, 1);
  const outgoing = [];
  for (let sample = 0; sample < 4; sample++) {
    b.advance(256);
    outgoing.push(fullDraw(b, 0));
  }
  assertUniformMovement(outgoing);
  b.advance(320);
  await b.flush();
  assert.equal(b.canvas.dataset.imageSrc, photo(1).thumbnail);
});
