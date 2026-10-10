import type { Photo } from '$lib/types/photography';

type Point = {
  x: number;
  y: number;
};

type Frame = {
  photo: Photo;
  image: HTMLImageElement;
  index: number;
  born: number;
};

type Transition = {
  to: Frame;
  origin: Point;
  started: number;
  radius: number;
};

type Crop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ImageRequest = {
  image: HTMLImageElement;
  promise: Promise<HTMLImageElement>;
  cancel: () => void;
  complete: boolean;
  owner?: Frame;
};

export interface MosaicStatus {
  kind: 'loading' | 'ready' | 'empty' | 'error';
  message: string;
  hasPhoto: boolean;
}

export interface MosaicRenderer {
  setPhotos: (photos: Photo[]) => void;
  setPaused: (paused: boolean) => void;
  point: (position: Point | null) => void;
  next: (position?: Point) => void;
  destroy: () => void;
}

const HOLD_DURATION = 8_800;
const ZOOM_PER_SECOND = 0.003;
const WAVE_DURATION = 760;
const TILE_DURATION = 420;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const ease = (value: number) => value * value * (3 - 2 * value);

/** Runs the mosaic on one canvas, with a single animation clock and bounded image cache. */
export function createMosaicRenderer(
  canvas: HTMLCanvasElement,
  onChange: (photo: Photo, index: number) => void,
  onReady: () => void,
  onStatus: (status: MosaicStatus) => void = () => {}
): MosaicRenderer {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context) {
    throw new Error('A 2D canvas is required to display the photo mosaic.');
  }

  const ctx = context;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const imageCache = new Map<string, ImageRequest>();
  const upgrading = new WeakSet<Frame>();
  const fullSources = new Set<string>();
  let photos: Photo[] = [];
  let collection: string | null = null;
  let generation = 0;
  let current: Frame | null = null;
  let recordedImage: HTMLImageElement | null = null;
  let transition: Transition | null = null;
  let width = 1;
  let height = 1;
  let cell = 80;
  let cols = 1;
  let rows = 1;
  let paused = false;
  let inViewport = true;
  let destroyed = false;
  let loadingNext = false;
  let animationFrame = 0;
  let lastTick = 0;
  let lastPaint = 0;
  let time = 0;
  let motionTime = 0;
  let changedAt = 0;
  let pointer: Point = { x: 0, y: 0 };
  let pointerInside = false;
  let spotlight = 0;

  function sources(photo: Photo) {
    const variants = (photo.srcset ?? '')
      .split(',')
      .map((part) => {
        const match = part.trim().match(/^(.*)\s+(\d+)w$/);
        return match ? { url: match[1], width: Number(match[2]) } : null;
      })
      .filter((variant): variant is { url: string; width: number } => variant !== null)
      .sort((a, b) => a.width - b.width);
    const result = {
      preview:
        photo.thumbnail || variants.find((variant) => variant.width >= 640)?.url || photo.src,
      detail: variants.at(-1)?.url || photo.src,
      full: photo.fullSrc || variants.at(-1)?.url || photo.src
    };
    if (result.full !== result.detail) {
      fullSources.add(result.full);
    }
    return result;
  }

  function trimCache() {
    const activeFull = new Set(
      [current, transition?.to].flatMap((frame) => (frame ? [sources(frame.photo).full] : []))
    );
    for (const [url, request] of imageCache) {
      if (fullSources.has(url) && !activeFull.has(url) && (request.complete || request.owner)) {
        imageCache.delete(url);
        request.cancel();
      }
    }
    for (const [url, request] of imageCache) {
      if (imageCache.size <= 8) {
        break;
      }
      if (
        request.complete &&
        request.image !== current?.image &&
        request.image !== transition?.to.image
      ) {
        imageCache.delete(url);
      }
    }
  }

  function loadSource(
    url: string,
    priority: 'high' | 'low' = 'low',
    owner?: Frame
  ): Promise<HTMLImageElement> {
    const existing = imageCache.get(url);
    if (existing) {
      if (owner && !existing.complete) {
        existing.owner = owner;
      }
      return existing.promise;
    }

    const image = new Image();
    image.decoding = 'async';
    image.fetchPriority = priority;
    const request: ImageRequest = {
      image,
      promise: Promise.resolve(image),
      cancel: () => {},
      complete: false,
      owner
    };
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) {
          return;
        }
        settled = true;
        request.complete = true;
        // Completed cache entries must not retain a Frame and its newer, much larger bitmap.
        request.owner = undefined;
        window.clearTimeout(timeout);
        image.onload = null;
        image.onerror = null;
        if (error) {
          if (imageCache.get(url) === request) {
            imageCache.delete(url);
          }
          image.src = '';
          reject(error);
        } else {
          resolve(image);
          trimCache();
        }
      };
      const timeout = window.setTimeout(
        () => finish(new Error('Photo loading timed out.')),
        fullSources.has(url) ? 60_000 : 15_000
      );
      image.onload = () => {
        // Loading bytes does not guarantee decoding; keep the smaller bitmap visible until ready.
        if (typeof image.decode === 'function') {
          void image.decode().then(
            () => finish(),
            () => finish(new Error('Photo could not be decoded.'))
          );
        } else {
          finish();
        }
      };
      image.onerror = () => finish(new Error('Photo could not be loaded.'));
      request.cancel = () => {
        if (settled) {
          return;
        }
        finish(new Error('Photo request cancelled.'));
      };
      // Canvas never reads pixels, so remote images do not need permissive CORS headers.
      image.src = url;
    });
    request.promise = promise;
    imageCache.set(url, request);
    trimCache();
    return promise;
  }

  async function loadPhoto(photo: Photo, priority: 'high' | 'low' = 'high') {
    const version = generation;
    const { preview, detail, full } = sources(photo);
    for (const url of [full, detail, preview]) {
      const cached = imageCache.get(url);
      if (cached?.complete) {
        return cached.promise;
      }
    }
    for (const url of new Set([preview, detail, full])) {
      try {
        return await loadSource(url, priority);
      } catch {
        if (destroyed || version !== generation) {
          throw new Error('This photo request is no longer needed.');
        }
      }
    }
    throw new Error('No photograph size could be loaded.');
  }

  /** Upgrade the displayed bitmap without resetting its crop, clock, or transition. */
  function improve(frame: Frame) {
    if (upgrading.has(frame)) {
      return;
    }
    upgrading.add(frame);
    const { detail, full } = sources(frame.photo);
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection;
    const upgrades = [...new Set(connection?.saveData ? [detail] : [detail, full])];
    void (async () => {
      for (const url of upgrades) {
        if (destroyed || (frame !== current && frame !== transition?.to)) {
          return;
        }
        // Full files can be 45 megapixels. Finish the wave before decoding a second full image.
        if (url === full && full !== detail && frame === transition?.to) {
          upgrading.delete(frame);
          return;
        }
        try {
          const image = await loadSource(url, 'high', frame);
          if (destroyed || (frame !== current && frame !== transition?.to)) {
            return;
          }
          if (image.naturalWidth >= frame.image.naturalWidth) {
            frame.image = image;
          }
          paint();
          trimCache();
        } catch {
          // A sharpness upgrade must never replace a successfully displayed photograph with an error.
        }
      }
    })();
  }

  function preload(index = transition?.to.index ?? current?.index ?? 0) {
    const version = generation;
    for (let offset = 1; offset <= Math.min(2, photos.length - 1); offset++) {
      const { preview, detail } = sources(photos[(index + offset) % photos.length]);
      void loadSource(preview)
        .then(() => {
          // Only the nearest next photo gets a large preload; full files are reserved for display.
          if (offset === 1 && !destroyed && generation === version) {
            return loadSource(detail);
          }
        })
        .catch(() => {});
    }
  }

  /** Source coordinates for a gently moving cover crop, shared by every mosaic tile. */
  function crop(frame: Frame): Crop {
    // Keep a constant velocity for this frame's whole visible lifetime, including both waves
    // and any wait for the next image. A fixed-duration clamp would freeze the outgoing photo.
    const elapsed = reducedMotion.matches ? 0 : Math.max(0, motionTime - frame.born) / 1000;
    const zoomDelta = elapsed * ZOOM_PER_SECOND;
    const zoom = 1 + zoomDelta;
    const scale =
      Math.max(width / frame.image.naturalWidth, height / frame.image.naturalHeight) * zoom;
    const cropWidth = width / scale;
    const cropHeight = height / scale;
    const horizontalMargin = Math.max(0, frame.image.naturalWidth - cropWidth);
    const verticalMargin = Math.max(0, frame.image.naturalHeight - cropHeight);
    const direction = frame.index % 2 === 0 ? 1 : -1;
    // These source offsets produce linear screen-space translation alongside the zoom.
    // Using less than half the added zoom margin keeps every crop inside the photograph.
    return {
      x: horizontalMargin / 2 + direction * cropWidth * zoomDelta * 0.28,
      y: verticalMargin / 2 - direction * cropHeight * zoomDelta * 0.2,
      width: cropWidth,
      height: cropHeight
    };
  }

  function drawImage(frame: Frame, source: Crop) {
    ctx.drawImage(
      frame.image,
      source.x,
      source.y,
      source.width,
      source.height,
      0,
      0,
      width,
      height
    );
  }

  function recordImage(image: HTMLImageElement | null) {
    if (recordedImage === image) return;
    recordedImage = image;
    // Mirror public rendering diagnostics on the accessible canvas control.
    for (const element of [canvas, canvas.parentElement]) {
      if (!element) continue;
      if (image) {
        element.dataset.imageSrc = image.currentSrc || image.src;
        element.dataset.imageWidth = String(image.naturalWidth);
        element.dataset.imageHeight = String(image.naturalHeight);
      } else {
        delete element.dataset.imageSrc;
        delete element.dataset.imageWidth;
        delete element.dataset.imageHeight;
      }
    }
  }

  function paint() {
    if (!current) {
      recordImage(null);
      ctx.fillStyle = '#253d38';
      ctx.fillRect(0, 0, width, height);
      return;
    }
    ctx.globalAlpha = 1;
    drawImage(current, crop(current));
    recordImage(current.image);

    if (transition) {
      const source = crop(transition.to);
      const elapsed = time - transition.started;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = col * cell;
          const y = row * cell;
          const w = Math.min(cell, width - x);
          const h = Math.min(cell, height - y);
          const distance = Math.hypot(
            x + w / 2 - transition.origin.x,
            y + h / 2 - transition.origin.y
          );
          const delay = (distance / transition.radius) * WAVE_DURATION;
          const progress = clamp((elapsed - delay) / TILE_DURATION);
          if (progress === 0) continue;
          ctx.globalAlpha = ease(progress);
          ctx.drawImage(
            transition.to.image,
            source.x + (x / width) * source.width,
            source.y + (y / height) * source.height,
            (w / width) * source.width,
            (h / height) * source.height,
            x,
            y,
            w + 0.35,
            h + 0.35
          );
          const edge = Math.sin(progress * Math.PI);
          if (edge > 0.02) {
            ctx.globalAlpha = edge * 0.43;
            ctx.strokeStyle = '#f5f2e7';
            ctx.lineWidth = 0.8;
            ctx.strokeRect(x + 0.4, y + 0.4, w - 0.8, h - 0.8);
          }
        }
      }
      ctx.globalAlpha = 1;
      if (elapsed >= WAVE_DURATION + TILE_DURATION) {
        current = transition.to;
        transition = null;
        recordImage(current.image);
        changedAt = motionTime;
        trimCache();
        improve(current);
        preload();
      }
    }

    if (spotlight > 0.005) {
      const radius = Math.min(260, width * 0.48);
      const gradient = ctx.createRadialGradient(
        pointer.x,
        pointer.y,
        0,
        pointer.x,
        pointer.y,
        radius
      );
      gradient.addColorStop(0, `rgba(255,255,255,${0.57 * spotlight})`);
      gradient.addColorStop(0.35, `rgba(255,255,255,${0.28 * spotlight})`);
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      for (let col = 1; col < cols; col++) {
        ctx.moveTo(col * cell, 0);
        ctx.lineTo(col * cell, height);
      }
      for (let row = 1; row < rows; row++) {
        ctx.moveTo(0, row * cell);
        ctx.lineTo(width, row * cell);
      }
      ctx.stroke();
    }
  }

  function canAnimate() {
    return !destroyed && inViewport && !document.hidden;
  }

  function requestPaint() {
    if (!animationFrame && canAnimate()) animationFrame = requestAnimationFrame(tick);
  }

  function tick(timestamp: number) {
    animationFrame = 0;
    if (!canAnimate()) {
      lastTick = 0;
      return;
    }
    const delta = lastTick ? Math.min(80, timestamp - lastTick) : 0;
    lastTick = timestamp;
    time += delta;
    if (!paused && !reducedMotion.matches) motionTime += delta;

    const target = pointerInside ? 1 : 0;
    spotlight = reducedMotion.matches
      ? target
      : spotlight + (target - spotlight) * Math.min(1, delta / 95);
    if (Math.abs(spotlight - target) < 0.005) spotlight = target;

    const moving = current && !paused && !reducedMotion.matches;
    // Photographic motion needs only 30fps; interaction waves render at the display refresh rate.
    if (transition || timestamp - lastPaint >= 30 || !moving) {
      paint();
      lastPaint = timestamp;
    }
    if (
      current &&
      !transition &&
      !loadingNext &&
      !paused &&
      !reducedMotion.matches &&
      photos.length > 1 &&
      motionTime - changedAt >= HOLD_DURATION
    ) {
      void next();
    }
    if (moving || transition || spotlight !== target) requestPaint();
    else lastTick = 0;
  }

  function announce(frame: Frame) {
    onChange(frame.photo, frame.index);
    onReady();
    onStatus({ kind: 'ready', message: '', hasPhoto: true });
  }

  function reveal(frame: Frame, origin: Point) {
    if (!current || reducedMotion.matches) {
      current = frame;
      transition = null;
      changedAt = motionTime;
      paint();
    } else {
      transition = {
        to: frame,
        origin,
        started: time,
        radius: Math.max(
          Math.hypot(origin.x, origin.y),
          Math.hypot(width - origin.x, origin.y),
          Math.hypot(origin.x, height - origin.y),
          Math.hypot(width - origin.x, height - origin.y),
          1
        )
      };
    }
    announce(frame);
    trimCache();
    improve(frame);
    preload();
    requestPaint();
  }

  /** Starts the next photograph at the click origin, without waiting for the automatic timer. */
  async function next(position?: Point) {
    if (destroyed || loadingNext || !photos.length) return;
    if (!current) {
      replaceCollection(photos, true);
      return;
    }
    if (photos.length < 2) return;
    loadingNext = true;
    const version = generation;
    if (transition) {
      current = transition.to;
      transition = null;
      trimCache();
    }
    const fromIndex = current.index;
    let succeeded = false;
    for (let offset = 1; offset < photos.length; offset++) {
      const index = (fromIndex + offset) % photos.length;
      try {
        const image = await loadPhoto(photos[index]);
        if (version !== generation || destroyed) return;
        const frame = { photo: photos[index], image, index, born: motionTime };
        reveal(frame, position ?? { x: width * (index % 2 ? 0.3 : 0.7), y: height * 0.55 });
        succeeded = true;
        break;
      } catch {
        if (version !== generation || destroyed) return;
      }
    }
    if (version === generation) {
      loadingNext = false;
      if (!succeeded) {
        improve(current);
        onStatus({
          kind: 'error',
          message: 'The next photograph could not be loaded. Please try again.',
          hasPhoto: true
        });
      }
      // Retry on the next interval if every remaining photograph is temporarily unavailable.
      changedAt = motionTime;
    }
  }

  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const previousWidth = width;
    const previousHeight = height;
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelWidth = Math.round(width * ratio);
    const pixelHeight = Math.round(height * ratio);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    cols = Math.max(5, Math.round(width / 86));
    cell = width / cols;
    rows = Math.ceil(height / cell);
    if (transition) {
      transition.origin.x *= width / previousWidth;
      transition.origin.y *= height / previousHeight;
      transition.radius = Math.max(
        Math.hypot(transition.origin.x, transition.origin.y),
        Math.hypot(width - transition.origin.x, transition.origin.y),
        Math.hypot(transition.origin.x, height - transition.origin.y),
        Math.hypot(width - transition.origin.x, height - transition.origin.y),
        1
      );
    }
    paint();
    requestPaint();
  }

  function suspendOrResume() {
    lastTick = 0;
    if (canAnimate()) requestPaint();
    else if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  }

  function motionChanged() {
    if (reducedMotion.matches && transition) {
      current = transition.to;
      transition = null;
      trimCache();
      improve(current);
    }
    requestPaint();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      inViewport = entry.isIntersecting;
      suspendOrResume();
    },
    { threshold: 0 }
  );
  intersectionObserver.observe(canvas);
  document.addEventListener('visibilitychange', suspendOrResume);
  reducedMotion.addEventListener('change', motionChanged);
  resize();

  function replaceCollection(nextPhotos: Photo[], force = false) {
    const key = nextPhotos.map((photo) => `${photo.id}:${photo.src}`).join('|');
    if (!force && key === collection) return;
    collection = key;
    photos = nextPhotos;
    const version = ++generation;
    loadingNext = true;
    if (transition) {
      current = transition.to;
      transition = null;
    }
    const retained = nextPhotos.length ? [current?.photo, ...nextPhotos.slice(0, 3)] : [];
    const needed = new Set(
      retained.flatMap((photo) => (photo ? Object.values(sources(photo)) : []))
    );
    for (const [url, request] of imageCache) {
      if (!request.complete && !needed.has(url)) request.cancel();
    }
    if (!photos.length) {
      current = null;
      transition = null;
      loadingNext = false;
      paint();
      trimCache();
      onStatus({
        kind: 'empty',
        message: 'No photographs in this collection yet.',
        hasPhoto: false
      });
      requestPaint();
      return;
    }
    onStatus({ kind: 'loading', message: 'Loading photographs…', hasPhoto: current !== null });
    void (async () => {
      for (let index = 0; index < nextPhotos.length; index++) {
        try {
          const photo = nextPhotos[index];
          const image = await loadPhoto(photo);
          if (destroyed || version !== generation) return;
          reveal({ photo, image, index, born: motionTime }, { x: width * 0.7, y: height * 0.2 });
          loadingNext = false;
          return;
        } catch {
          if (destroyed || version !== generation) return;
        }
      }
      if (version === generation) {
        loadingNext = false;
        current = null;
        transition = null;
        paint();
        trimCache();
        onStatus({
          kind: 'error',
          message: 'Photographs could not be loaded. Select another collection or try again.',
          hasPhoto: false
        });
      }
    })();
    preload(0);
  }

  return {
    setPhotos: replaceCollection,
    setPaused(value) {
      paused = value;
      lastTick = 0;
      requestPaint();
    },
    point(position) {
      pointerInside = position !== null;
      if (position) pointer = position;
      requestPaint();
    },
    next(position) {
      void next(position);
    },
    destroy() {
      destroyed = true;
      ++generation;
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      document.removeEventListener('visibilitychange', suspendOrResume);
      reducedMotion.removeEventListener('change', motionChanged);
      for (const request of imageCache.values()) request.cancel();
      imageCache.clear();
    }
  };
}
