<!-- @component Render favorite photographs and a heading, advancing the film as it passes through the viewport. -->
<script lang="ts">
  import { onMount, type Snippet } from 'svelte';
  import { FilmStrip } from '@ryansalik/photo-api/ui';
  import '@ryansalik/photo-api/ui/styles.css';
  import type { Photo } from '$lib/types/photography';

  let { photos, heading }: { photos: Photo[]; heading: Snippet } = $props();
  let viewportWidth = $state(900);
  let viewport: HTMLDivElement;
  let film: HTMLDivElement;

  onMount(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    function updateScroll() {
      frame = 0;
      if (motion.matches) return;
      // Preserve the photograph revealed by keyboard navigation while it has focus.
      if (viewport.matches(':focus-visible') || viewport.querySelector(':focus-visible')) return;

      const distance = viewport.scrollWidth - viewport.clientWidth;
      if (distance <= 1) return;

      const bounds = viewport.getBoundingClientRect();
      const top = window.scrollY + bounds.top;
      const pageEnd = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const start = Math.max(0, Math.min(pageEnd, top - window.innerHeight));
      // Reach the last photograph even when the page ends before the strip leaves the screen.
      const end = Math.min(pageEnd, top + bounds.height);
      if (end <= start) return;

      const progress = Math.min(1, Math.max(0, (window.scrollY - start) / (end - start)));
      viewport.scrollLeft = progress * distance;
    }

    function scheduleScroll() {
      if (!frame) frame = requestAnimationFrame(updateScroll);
    }

    const observer = new ResizeObserver(scheduleScroll);
    observer.observe(document.body);
    observer.observe(viewport);
    observer.observe(film);
    window.addEventListener('scroll', scheduleScroll, { passive: true });
    window.addEventListener('resize', scheduleScroll);
    motion.addEventListener('change', scheduleScroll);
    scheduleScroll();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('scroll', scheduleScroll);
      window.removeEventListener('resize', scheduleScroll);
      motion.removeEventListener('change', scheduleScroll);
    };
  });

  function handleKeydown(event: KeyboardEvent) {
    if (event.target !== viewport || event.altKey || event.ctrlKey || event.metaKey) return;

    const distance = viewport.scrollWidth - viewport.clientWidth;
    let target = viewport.scrollLeft;
    switch (event.key) {
      case 'ArrowRight':
        target += viewport.clientWidth * 0.25;
        break;
      case 'ArrowLeft':
        target -= viewport.clientWidth * 0.25;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = distance;
        break;
      default:
        return;
    }

    event.preventDefault();
    viewport.scrollLeft = Math.min(distance, Math.max(0, target));
  }
</script>

<svelte:window bind:innerWidth={viewportWidth} onkeydown={handleKeydown} />

<section id="photography" class="strip-content" aria-labelledby="photography-title">
  {@render heading()}
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (The focusable region supports arrow-key scrolling of the horizontal film strip.) -->
  <div
    class="strip-scroll"
    bind:this={viewport}
    tabindex="0"
    role="region"
    aria-label="Favorite photographs. Scroll down or use the left and right arrow keys to explore."
  >
    <div class="film-strip" bind:this={film}>
      <FilmStrip
        photos={photos.slice(0, 5)}
        viewKey="portfolio-favorites"
        brandText="Ryan Salik"
        showFavoriteMarks={false}
        rowHeight={viewportWidth <= 600 ? 190 : 220}
      />
    </div>
  </div>
</section>

<style>
  .strip-content {
    width: 100%;
    padding-block: 75px 30px;
    background: #eaece4;
    overflow: clip;
  }

  .strip-scroll {
    /* Allow scroll-driven movement without direct horizontal gestures. */
    overflow-x: hidden;
    overflow-y: hidden;
    touch-action: pan-y pinch-zoom;
    padding: 40px 0 60px;
    scrollbar-width: none;
    scroll-behavior: auto;
  }

  .strip-scroll::-webkit-scrollbar {
    display: none;
  }

  .strip-scroll:focus-visible {
    outline: 2px solid var(--green);
    outline-offset: -4px;
  }

  .film-strip {
    width: max-content;
    position: relative;
    transform: rotate(-2.1deg);
    transform-origin: 40% 50%;
    box-shadow: 0 18px 24px -18px #1a17127a;
    margin: 12px 0 12px -42px;
    --photo-film-font-sans: var(--font-sans);
    --photo-film-font-display: var(--font-serif);
  }

  @media (min-width: 1700px) {
    .film-strip {
      margin-left: auto;
      margin-right: auto;
    }
  }

  @media (max-width: 600px) {
    .film-strip {
      margin-left: 22px;
    }

    .strip-scroll {
      padding-top: 26px;
      padding-bottom: 30px;
    }
  }

  @media (max-width: 700px) {
    .strip-content {
      padding-block: 45px 25px;
    }
  }
</style>
