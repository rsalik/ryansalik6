<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import PhotoMosaic from './PhotoMosaic.svelte';
  import Header from './Header.svelte';
  import Icon from './Icon.svelte';
  import { Icon as PhotoIcon } from '@ryansalik/photo-api/ui';
  import type { Photo, PhotoCollection, PhotoOptions } from '$lib/types/photography';
  import { shuffled } from '$lib/photography/sequence';

  let { photos, options }: { photos: Photo[]; options: PhotoOptions } = $props();

  let selection = $state('tag:landscape');
  let search = $state('');
  let label = $state('Landscape');
  let filtered = $state<Photo[] | null>(null);
  let current = $state<Photo | null>(null);
  let index = $state(0);

  let open = $state(false);
  let paused = $state(false);
  let busy = $state(false);
  let error = $state('');

  let panel: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let mosaic: PhotoMosaic;
  let request: AbortController | undefined;
  let scrollTrack: HTMLDivElement;
  let headerVisible = $state(false);
  let reducedMotion = $state(false);

  const displayed = $derived(filtered ?? photos);
  const active = $derived(current ?? displayed[0]);
  const matchingTags = $derived(
    options.tags.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const matchingAlbums = $derived(
    options.albums.filter((item) => item.toLowerCase().includes(search.trim().toLowerCase()))
  );
  const collectionGroups = $derived([
    { kind: 'tag' as const, name: 'Tags', items: matchingTags },
    { kind: 'album' as const, name: 'Albums', items: matchingAlbums }
  ]);

  /** Native scrolling pins the opening while its frame and navigation ease into view. */
  onMount(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const update = () => {
      frame = 0;
      reducedMotion = media.matches;
      const travel = Math.max(1, scrollTrack.offsetHeight - window.innerHeight);
      const raw = Math.min(1, Math.max(0, -scrollTrack.getBoundingClientRect().top / travel));
      const progress = media.matches ? 1 : raw * raw * (3 - 2 * raw);
      scrollTrack.style.setProperty('--reveal', String(progress));
      headerVisible = progress > 0.8;
    };
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    media.addEventListener('change', schedule);
    update();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      media.removeEventListener('change', schedule);
    };
  });

  function close(restoreFocus = false) {
    open = false;
    if (restoreFocus) {
      trigger?.focus();
    }
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      close(true);
    }
  }

  function handleOutsidePointerDown(event: PointerEvent) {
    if (open && panel && !panel.contains(event.target as Node)) {
      close();
    }
  }

  function toggleCollections() {
    if (!open) {
      search = '';
    }
    open = !open;
  }

  function handlePhotoChange(photo: Photo, position: number) {
    current = photo;
    index = position;
  }

  function togglePlayback() {
    paused = !paused;
  }

  /** Replace the collection only after a successful response; canceled requests cannot win. */
  async function selectCollection(kind: 'album' | 'tag' | 'favorite', name: string) {
    request?.abort();
    const controller = new AbortController();
    request = controller;
    busy = true;
    error = '';

    try {
      const params = new URLSearchParams({ [kind]: kind === 'favorite' ? '1' : name });
      const response = await fetch(`/api/photos?${params}`, { signal: controller.signal });
      if (!response.ok) {
        throw new Error('Could not load collection');
      }

      const result: PhotoCollection = await response.json();
      if (controller.signal.aborted) {
        return;
      }
      if (result.source === 'unavailable') {
        throw new Error('Photography is unavailable');
      }

      filtered = shuffled(result.photos);
      current = null;
      index = 0;
      selection = `${kind}:${name.toLowerCase()}`;
      label = name;
      close(true);
    } catch {
      if (!controller.signal.aborted) {
        error = 'These photos could not be loaded. Please try again.';
      }
    } finally {
      if (!controller.signal.aborted) {
        busy = false;
      }
    }
  }

  onDestroy(() => request?.abort());
</script>

<svelte:window onkeydown={handleWindowKeydown} onpointerdown={handleOutsidePointerDown} />

<div class="scroll-track" class:reduced-motion={reducedMotion} bind:this={scrollTrack}>
  <div class="hero-stage">
    <div class="hero-header" inert={!headerVisible}>
      <Header />
    </div>
    <section class="hero" aria-labelledby="hero-title">
      <PhotoMosaic
        bind:this={mosaic}
        photos={displayed}
        paused={paused || open}
        onchange={handlePhotoChange}
      />
      <div class="shade" aria-hidden="true"></div>
      <div class="hero-tools" bind:this={panel}>
        <div class="filter-wrap">
          <button
            class="glass"
            class:active={open}
            bind:this={trigger}
            onclick={toggleCollections}
            aria-expanded={open}
            aria-controls="photo-collections"
          >
            <PhotoIcon
              name={selection.startsWith('album:')
                ? 'album'
                : selection.startsWith('favorite:')
                  ? 'star'
                  : 'tag'}
              size={16}
            />
            <span>{label}</span>
            <PhotoIcon name="chevron" size={14} />
          </button>
          {#if open}
            <div class="collection-panel" id="photo-collections" aria-label="Photo collections">
              <div class="panel-heading">
                <span>PHOTO COLLECTIONS</span>
                <button aria-label="Close photo collections" onclick={() => close(true)}>
                  <Icon name="close" size={16} />
                </button>
              </div>
              <label class="collection-search">
                <span class="sr-only">Search tags and albums</span>
                <PhotoIcon name="search" size={16} />
                <input type="search" placeholder="Search tags & albums" bind:value={search} />
              </label>
              <button
                class="collection-option"
                disabled={busy}
                aria-pressed={selection === 'favorite:favorites'}
                onclick={() => selectCollection('favorite', 'Favorites')}
              >
                <span>Favorites</span>
                <span>{selection === 'favorite:favorites' ? '✓' : '☆'}</span>
              </button>
              {#each collectionGroups as group}
                {#if group.items.length}
                  <div class="option-group">
                    <h3>{group.name}</h3>
                    {#each group.items as option}
                      <button
                        class="collection-option"
                        disabled={busy}
                        aria-pressed={selection === `${group.kind}:${option.toLowerCase()}`}
                        onclick={() => selectCollection(group.kind, option)}
                      >
                        <span class="option-label">
                          <PhotoIcon name={group.kind} size={16} />
                          <span class="option-name">{option}</span>
                        </span>
                        {#if selection === `${group.kind}:${option.toLowerCase()}`}
                          <PhotoIcon name="check" size={15} />
                        {/if}
                      </button>
                    {/each}
                  </div>
                {/if}
              {/each}

              {#if !matchingTags.length && !matchingAlbums.length}
                <p class="filter-status" role="status">No matching tags or albums.</p>
              {/if}

              {#if busy}
                <p class="filter-status" role="status">Loading photos…</p>
              {/if}

              {#if error}
                <p class="filter-status" role="alert">{error}</p>
              {/if}
            </div>
          {/if}
        </div>
        <a class="glass all-photos" href="https://photos.ryansalik.com">
          All Photos <Icon size={15} />
        </a>
      </div>
      <div class="hero-title">
        <h1 id="hero-title">RYAN SALIK</h1>
        <p>DEPARTMENT OF COMPUTER SCIENCE</p>
        <p>PRINCETON UNIVERSITY</p>
      </div>
      <div class="hero-bottom">
        <div class="photo-caption">
          <span class="frame-count">
            {String(displayed.length ? index + 1 : 0).padStart(2, '0')} / {String(
              displayed.length
            ).padStart(2, '0')}
          </span>
          <span>
            {active?.title ?? 'Photography by Ryan Salik'}
            <small>{active?.location ?? ''}</small>
          </span>
        </div>
        <a class="scroll-cue" href="#work" aria-label="Scroll to projects">
          <span>SCROLL</span>
          <Icon name="down" size={19} />
        </a>
        <div class="playback">
          <span class="interaction-hint">Click to change photo</span>
          <button
            class="glass icon-button"
            disabled={!displayed.length}
            aria-label={paused ? 'Play photo motion' : 'Pause photo motion'}
            aria-pressed={paused}
            onclick={togglePlayback}
          >
            <Icon name={paused ? 'play' : 'pause'} size={16} />
          </button>
          <button
            class="glass icon-button"
            disabled={displayed.length < 2}
            aria-label="Next photograph"
            onclick={() => mosaic?.nextPhoto()}
          >
            <Icon name="next" size={19} />
          </button>
        </div>
      </div>
      {#if displayed.length === 0}
        <div class="empty-photos" role="status">
          <p>No photographs in this collection yet.</p>
          <button class="glass" onclick={() => selectCollection('tag', 'Landscape')}>
            Back to landscapes
          </button>
        </div>
      {/if}
    </section>
    <div class="intro-line" inert={!headerVisible}>
      <span>
        <i aria-hidden="true"></i>
        <span class="intro-label">(c) 2026 RYAN SALIK</span>
      </span>
      <a href="#work">
        <span class="intro-label">SELECTED WORK</span>
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M12 4v16m-5-5 5 5 5-5" />
        </svg>
      </a>
    </div>
  </div>
</div>

<style>
  .scroll-track {
    --reveal: 0;
    --header-height: 94px;
    --frame-margin: 22px;
    --frame-bottom: 82px;
    height: calc(100svh + clamp(220px, 42svh, 420px));
    position: relative;
  }

  .hero-stage {
    position: sticky;
    top: 0;
    height: 100svh;
  }

  .hero-header {
    position: absolute;
    inset: 0 0 auto;
    transform: translateY(calc(-100% * (1 - var(--reveal))));
    opacity: var(--reveal);
  }

  .hero {
    position: absolute;
    top: calc(var(--header-height) * var(--reveal));
    left: calc(var(--frame-margin) * var(--reveal));
    right: calc(var(--frame-margin) * var(--reveal));
    height: calc(100svh - (var(--header-height) + var(--frame-bottom)) * var(--reveal));
    isolation: isolate;
    background: #35433c;
    color: #fff;
  }

  .reduced-motion {
    height: 100svh;
  }

  .reduced-motion .hero-stage {
    position: relative;
  }

  .intro-line {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: calc(var(--frame-bottom) * var(--reveal));
    opacity: var(--reveal);
    overflow: hidden;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-inline: var(--edge);
    font-size: 9px;
    letter-spacing: 1.1px;
    color: var(--muted);
  }

  .intro-line > span {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .intro-line i {
    display: inline-block;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--green);
  }

  .intro-line a {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .intro-line a svg {
    flex-shrink: 0;
  }

  .intro-line .intro-label {
    line-height: 1;
    text-box: trim-both cap alphabetic;
  }

  .shade {
    position: absolute;
    inset: 0;
    background:
      linear-gradient(180deg, #081a1d18, #081a1d12 25%, #06131025 60%, #06131080),
      radial-gradient(ellipse at 50% 48%, #03181166, transparent 70%);
    pointer-events: none;
    z-index: 1;
  }

  .hero-tools {
    position: absolute;
    top: 28px;
    right: 28px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    z-index: 5;
  }

  .glass {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    gap: 12px;
    border: 1px solid #ffffff60;
    background: linear-gradient(135deg, #ffffff19, #ffffff05), #152c245e;
    box-shadow:
      inset 0 1px 0 #ffffff38,
      0 3px 15px #00000008;
    backdrop-filter: blur(18px) saturate(1.2);
    -webkit-backdrop-filter: blur(18px) saturate(1.2);
    border-radius: 30px;
    min-height: 43px;
    padding: 0 17px;
    color: #fff;
    font-size: 11px;
    transition:
      background 0.2s,
      transform 0.2s,
      border-color 0.2s;
  }

  .glass:hover,
  .glass.active {
    background: #304a3e88;
    border-color: #ffffffa0;
    transform: translateY(-2px);
  }

  .filter-wrap {
    position: relative;
  }

  .filter-wrap > button > span {
    text-transform: capitalize;
  }

  .hero-title {
    pointer-events: none;
    position: absolute;
    z-index: 2;
    left: 20px;
    right: 20px;
    top: 48%;
    transform: translateY(-50%);
    text-align: center;
  }

  h1 {
    font-size: clamp(36px, 5vw, 74px);
    font-weight: 500;
    letter-spacing: 0.25em;
    margin: 0 -0.25em 27px 0;
  }

  .hero-title p {
    font-weight: 500;
    font-size: clamp(10px, 1vw, 13px);
    letter-spacing: 0.23em;
    line-height: 1.8;
    margin: 6px 0;
  }

  .hero-title p:last-child {
    font-size: 11px;
    letter-spacing: 0.2em;
    font-weight: 400;
  }

  .hero-bottom {
    position: absolute;
    z-index: 3;
    bottom: 26px;
    left: 30px;
    right: 28px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    pointer-events: none;
  }

  .photo-caption {
    display: flex;
    gap: 17px;
    align-items: center;
    font-size: 11px;
    line-height: 1.1;
  }

  .frame-count {
    font-size: 10px;
    opacity: 0.75;
    padding-right: 17px;
    border-right: 1px solid #ffffff60;
    white-space: nowrap;
  }

  .photo-caption small {
    display: block;
    font-size: 9px;
    opacity: 0.7;
    margin-top: 3px;
  }

  .playback {
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: auto;
  }

  .icon-button {
    width: 37px;
    min-height: 37px;
    padding: 0;
  }

  .interaction-hint {
    font-size: 10px;
    opacity: 0.7;
    margin-right: 12px;
  }

  .scroll-cue {
    position: absolute;
    left: 50%;
    bottom: 0;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    font-size: 8px;
    letter-spacing: 1.4px;
    pointer-events: auto;
    opacity: calc(1 - var(--reveal));
    visibility: visible;
  }

  .collection-panel {
    position: absolute;
    top: 56px;
    right: 0;
    width: 290px;
    max-height: min(430px, 60svh);
    overflow-y: auto;
    padding: 20px;
    color: #f9faf7;
    background: #21372de8;
    backdrop-filter: blur(30px);
    border: 1px solid #ffffff38;
    border-radius: 14px;
    box-shadow: 0 20px 70px #0003;
  }

  .panel-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    letter-spacing: 1px;
    font-size: 9px;
    opacity: 0.7;
  }

  .panel-heading button {
    background: none;
    border: 0;
    color: inherit;
    padding: 5px;
    display: flex;
  }

  .collection-panel p {
    font-family: var(--font-serif);
    font-size: 24px;
    margin: 12px 0 17px;
  }

  .collection-search {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 13px;
    margin: 15px 0 10px;
    border-radius: 6px;
    background: #10251bcc;
    color: #fff9;
  }

  .collection-search:focus-within {
    outline: 1px solid #abc7b2;
  }

  .collection-search input {
    width: 100%;
    min-width: 0;
    background: transparent;
    border: 0;
    outline: 0;
    color: #fff;
    font-size: 12px;
  }

  .collection-search input::placeholder {
    color: #ffffff99;
  }

  .option-group {
    border-top: 1px solid #ffffff23;
    margin-top: 9px;
    padding-top: 12px;
  }

  .option-group h3 {
    font-size: 9px;
    letter-spacing: 1px;
    text-transform: uppercase;
    opacity: 0.6;
    margin: 0 10px 5px;
    font-weight: 400;
  }

  .option-label {
    display: flex;
    gap: 11px;
    align-items: center;
  }

  .option-name {
    text-transform: capitalize;
  }

  .collection-option {
    width: 100%;
    border: 0;
    background: transparent;
    color: inherit;
    padding: 11px 10px;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    border-radius: 5px;
    font-size: 12px;
  }

  .collection-option:hover {
    background: #ffffff12;
  }

  .collection-option[aria-pressed='true'] {
    background: #ffffff19;
  }

  .collection-panel .filter-status {
    font: 11px/1.6 var(--font-sans);
  }

  .empty-photos {
    position: absolute;
    z-index: 4;
    bottom: 90px;
    left: 20px;
    right: 20px;
    text-align: center;
    font-size: 12px;
  }

  @media (max-width: 750px) {
    .scroll-track {
      --header-height: 78px;
      --frame-margin: 12px;
      --frame-bottom: 68px;
    }

    .hero-tools {
      top: 18px;
      right: 18px;
      gap: 8px;
    }

    .glass {
      min-height: 40px;
      font-size: 10px;
      padding: 0 13px;
      gap: 8px;
    }

    h1 {
      font-size: clamp(28px, 7vw, 49px);
      letter-spacing: 0.2em;
      margin-bottom: 23px;
    }

    .hero-title p {
      font-size: 9px;
      letter-spacing: 0.13em;
    }

    .hero-title p:last-child {
      font-size: 9px;
      letter-spacing: 0.18em;
    }

    .hero-bottom {
      left: 20px;
      right: 18px;
      bottom: 22px;
    }

    .photo-caption {
      gap: 10px;
      font-size: 10px;
      max-width: 65%;
    }

    .frame-count {
      display: none;
    }

    .photo-caption small {
      font-size: 9px;
    }

    .interaction-hint,
    .scroll-cue {
      display: none;
    }

    .icon-button {
      width: 37px;
      min-height: 37px;
      padding: 0;
    }

    .collection-panel {
      right: -104px;
      max-width: calc(100vw - 60px);
    }

    .intro-line {
      font-size: 7px;
      letter-spacing: 0.7px;
    }

    .intro-line > span {
      max-width: 64%;
      line-height: 1.7;
    }

    .intro-line i {
      flex-shrink: 0;
    }

    .intro-line a {
      gap: 8px;
    }
  }
</style>
