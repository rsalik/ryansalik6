<!-- @component Render the portfolio's hero, projects, and scroll-driven favorite photographs from page data. -->
<script lang="ts">
  import Hero from '$lib/components/Hero.svelte';
  import ProjectCard from '$lib/components/ProjectCard.svelte';
  import FilmStrip from '$lib/components/FilmStrip.svelte';
  import Icon from '$lib/components/Icon.svelte';
  import { projects, photographyUrl } from '$lib/data/projects';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Ryan Salik</title>
  <meta name="description" content="Ryan Salik portfolio website." />
</svelte:head>

<main id="main">
  <Hero photos={data.photography.photos} options={data.photography.options} />
  <section id="work" class="work-section section-shell" aria-labelledby="work-title">
    <div class="section-heading">
      <div>
        <p class="eyebrow">01 / SOFTWARE</p>
        <h2 class="section-title" id="work-title">Past Projects.</h2>
      </div>
      <p class="section-description">
        Web applications, multiplayer games, and tools for research and collaboration.
      </p>
    </div>
    <div class="featured-projects">
      {#each projects.slice(0, 2) as project, index}
        <ProjectCard {project} {index} featured />
      {/each}
    </div>
    <div class="more-projects">
      {#each projects.slice(2) as project, index}
        <ProjectCard {project} index={index + 2} />
      {/each}
    </div>
  </section>
  {#snippet photoHeading()}
    <div class="photo-heading section-shell">
      <div>
        <p class="eyebrow">02 / PHOTOS</p>
        <h2 class="section-title" id="photography-title">Photography.</h2>
      </div>
      <div class="photo-intro">
        <a class="text-link" href={photographyUrl}>Photo portfolio <Icon size={17} /></a>
      </div>
    </div>
  {/snippet}
  {#if data.photography.favorites.length}
    <FilmStrip photos={data.photography.favorites} heading={photoHeading} />
  {:else}
    <section id="photography" class="photography-section" aria-labelledby="photography-title">
      {@render photoHeading()}
      <div class="photo-unavailable section-shell">
        <p>Photos are temporarily unavailable.</p>
        <a class="text-link" href={photographyUrl}>Visit the photo portfolio <Icon size={17} /></a>
      </div>
    </section>
  {/if}
</main>

<style>
  .work-section {
    padding-top: 80px;
    padding-bottom: 88px;
  }

  .section-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 60px;
    margin-bottom: 45px;
  }

  .eyebrow {
    margin: 0 0 22px;
    color: var(--muted);
  }

  .section-description {
    width: 315px;
    font-size: 13px;
    line-height: 1.9;
    color: var(--muted);
    margin: 0 0 3px;
  }

  .featured-projects {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 34px;
  }

  .more-projects {
    display: grid;
    grid-template-columns: 1fr 1fr;
    column-gap: 50px;
    margin-top: 58px;
  }

  .photography-section {
    --photo-background: #eaece4;
    --photo-padding-top: 75px;
    --photo-padding-bottom: 30px;
    background: var(--photo-background);
    padding: var(--photo-padding-top) 0 var(--photo-padding-bottom);
  }

  .photo-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 60px;
  }

  .photo-heading .section-title {
    max-width: 660px;
    font-size: clamp(40px, 4.2vw, 59px);
  }

  .photo-intro {
    max-width: 340px;
  }

  .photo-intro p {
    font-size: 12px;
    line-height: 1.9;
    margin: 0 0 21px;
    color: var(--muted);
  }

  .photo-unavailable {
    padding-block: 60px;
  }

  @media (max-width: 900px) {
    .section-heading {
      gap: 30px;
    }

    .section-description {
      width: 265px;
    }

    .more-projects {
      column-gap: 30px;
    }

    .photo-heading {
      gap: 30px;
    }
  }

  @media (max-width: 700px) {
    .work-section {
      padding-top: 45px;
      padding-bottom: 40px;
    }

    .section-heading {
      display: block;
      margin-bottom: 30px;
    }

    .eyebrow {
      margin-bottom: 18px;
      font-size: 9px;
    }

    .section-description {
      width: 100%;
      max-width: 370px;
      margin-top: 20px;
      font-size: 12px;
    }

    .featured-projects {
      grid-template-columns: 1fr;
      gap: 37px;
    }

    .more-projects {
      grid-template-columns: 1fr;
      margin-top: 37px;
    }

    .photo-heading {
      display: block;
    }

    .photo-intro {
      max-width: 350px;
      margin-top: 23px;
    }

    .photography-section {
      --photo-padding-top: 45px;
      --photo-padding-bottom: 25px;
    }

    .section-title {
      font-size: 43px;
    }
  }
</style>
