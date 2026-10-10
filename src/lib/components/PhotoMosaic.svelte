<script lang="ts">
  import { onMount } from 'svelte';
  import type { Photo } from '$lib/types/photography';
  import {
    createMosaicRenderer,
    type MosaicRenderer,
    type MosaicStatus
  } from '$lib/mosaic/renderer';

  let {
    photos,
    paused = false,
    onchange,
    onstatus,
    label = 'View the next photograph'
  }: {
    photos: Photo[];
    paused?: boolean;
    onchange?: (photo: Photo, index: number) => void;
    onstatus?: (status: MosaicStatus) => void;
    label?: string;
  } = $props();

  let canvas: HTMLCanvasElement;
  let renderer: MosaicRenderer | undefined = $state.raw();
  let ready = $state(false);
  let title = $state('');
  let status = $state<MosaicStatus>({ kind: 'loading', message: '', hasPhoto: false });

  $effect(() => renderer?.setPhotos(photos));
  $effect(() => renderer?.setPaused(paused));

  onMount(() => {
    renderer = createMosaicRenderer(canvas, handlePhotoChange, handleReady, handleStatusChange);
    return () => renderer?.destroy();
  });

  function handlePhotoChange(photo: Photo, index: number) {
    title = photo.title;
    onchange?.(photo, index);
  }

  function handleReady() {
    ready = true;
  }

  function handleStatusChange(nextStatus: MosaicStatus) {
    status = nextStatus;

    if (!nextStatus.hasPhoto) {
      title = '';
    }

    // Empty/error collections must not leave a photograph from the previous filter visible.
    if (nextStatus.kind === 'empty' || (nextStatus.kind === 'error' && !nextStatus.hasPhoto)) {
      ready = false;
    }

    onstatus?.(nextStatus);
  }

  function position(event: MouseEvent | PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
  }

  function activate(event: MouseEvent) {
    renderer?.next(event.detail > 0 ? position(event) : undefined);
  }

  function handlePointerMove(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      renderer?.point(position(event));
    }
  }

  function handleFocus(event: FocusEvent & { currentTarget: HTMLButtonElement }) {
    if (event.currentTarget.matches(':focus-visible')) {
      renderer?.point({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 });
    }
  }

  function clearSpotlight() {
    renderer?.point(null);
  }

  /** Lets companion controls advance the mosaic using the same accessible interaction. */
  export function nextPhoto() {
    renderer?.next();
  }
</script>

<button
  class="mosaic"
  type="button"
  aria-label={status.kind === 'error' && !status.hasPhoto
    ? 'Retry loading photographs'
    : title
      ? `${label}. Currently showing ${title}.`
      : label}
  aria-disabled={status.kind === 'empty' || status.kind === 'loading'}
  onclick={activate}
  onpointermove={handlePointerMove}
  onpointerleave={clearSpotlight}
  onfocus={handleFocus}
  onblur={clearSpotlight}
>
  {#if photos[0] && status.kind !== 'error'}
    <img
      class:loaded={ready}
      src={photos[0].thumbnail || photos[0].src}
      alt=""
      fetchpriority="high"
      aria-hidden="true"
    />
  {/if}

  <canvas bind:this={canvas} class:ready aria-hidden="true"></canvas>
</button>
<span class="mosaic-status" class:visible-error={status.kind === 'error'} role="status">
  {status.message}
</span>

<style>
  .mosaic {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    padding: 0;
    overflow: hidden;
    border: 0;
    border-radius: inherit;
    background: #253d38;
    cursor: default;
    -webkit-tap-highlight-color: transparent;
    touch-action: pan-y;
  }

  .mosaic:focus-visible {
    outline: 2px solid #fff9e8;
    outline-offset: -8px;
  }

  .mosaic[aria-disabled='true'] {
    cursor: default;
  }

  .mosaic-status {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .mosaic-status.visible-error {
    z-index: 3;
    left: 24px;
    right: 24px;
    bottom: 94px;
    width: auto;
    height: auto;
    clip-path: none;
    white-space: normal;
    text-align: center;
    color: #fff;
    font-size: 12px;
    line-height: 1.6;
    pointer-events: none;
  }

  img,
  canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  img {
    object-fit: cover;
  }

  img.loaded {
    visibility: hidden;
  }

  canvas {
    opacity: 0;
  }

  canvas.ready {
    opacity: 1;
  }
</style>
