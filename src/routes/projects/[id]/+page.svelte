<!-- @component Render a project's artwork, description, external links, and neighboring projects from page data. -->
<script lang="ts">
  import Icon from '$lib/components/Icon.svelte';
  import { unavailableProjectNote } from '$lib/data/projects';
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>{data.project.name} — Ryan Salik</title>
  <meta name="description" content={data.project.blurb} />
</svelte:head>

<main class="project-page section-shell" id="main">
  <a class="back-link" href="/#work">
    <Icon name="back" size={17} /> All projects
  </a>
  <div class="project-title">
    <div>
      <p class="eyebrow">{String(data.index + 1).padStart(2, '0')} / {data.project.category}</p>
      <h1>{data.project.name}</h1>
    </div>
    <span class="project-tech">{data.project.stack.join(' / ')}</span>
  </div>
  <div class="project-content">
    <div class="project-visual">
      <img
        src={data.project.image}
        alt={data.project.imageAlt}
        width="1280"
        height="731"
        fetchpriority="high"
      />
    </div>
    <div class="project-details">
      <h2>About the project</h2>
      <div class="description">
        <p>{data.project.description}</p>
        {#if data.project.unavailableOnline}
          <p class="availability-note">
            {unavailableProjectNote}
          </p>
        {/if}

        <div class="project-links">
          <a href={data.project.repoLink} class="text-link">View source <Icon size={17} /></a>
          {#if data.project.webLink}
            <a href={data.project.webLink} class="text-link">
              {data.project.webLinkLabel ??
                (data.project.unavailableOnline ? 'Original project link' : 'Visit website')}
              <Icon size={17} />
            </a>
          {/if}
        </div>
      </div>
    </div>
  </div>
  <nav class="project-navigation" aria-label="Previous and next projects">
    <a class="neighbor previous" href={`/projects/${data.previous.id}`}>
      <span class="neighbor-direction">
        <Icon name="back" size={17} /> Previous project
      </span>
      <div class="neighbor-body">
        <img src={data.previous.image} alt="" width="120" height="80" loading="lazy" />
        <span>{data.previous.name}</span>
      </div>
    </a>
    <a class="neighbor next" href={`/projects/${data.next.id}`}>
      <span class="neighbor-direction">Next project <Icon name="next" size={17} /></span>
      <div class="neighbor-body">
        <span>{data.next.name}</span>
        <img src={data.next.image} alt="" width="120" height="80" loading="lazy" />
      </div>
    </a>
  </nav>
</main>

<style>
  .project-page {
    padding-top: 20px;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--muted);
  }

  .project-title {
    display: flex;
    justify-content: space-between;
    gap: 40px;
    align-items: flex-end;
    margin: 28px 0 28px;
  }

  .eyebrow {
    color: var(--muted);
    margin: 0 0 13px;
  }

  h1 {
    font-family: var(--font-serif);
    font-size: clamp(44px, 4.5vw, 64px);
    line-height: 1.05;
    font-weight: 300;
    margin: 0;
    letter-spacing: -1.7px;
  }

  .project-tech {
    font-size: 11px;
    color: var(--muted);
    margin-bottom: 10px;
  }

  .project-content {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    align-items: center;
    gap: 45px;
    margin-bottom: 32px;
  }

  .project-visual {
    padding: 26px;
    background: #e3e7de;
    border-radius: 3px;
  }

  .project-visual img {
    width: 100%;
    height: auto;
    max-height: clamp(220px, calc(100svh - 500px), 440px);
    object-fit: contain;
    border-radius: 4px;
    box-shadow: 0 17px 35px -22px #24372980;
  }

  .project-details {
    min-width: 0;
  }

  h2 {
    font-size: 11px;
    font-weight: 500;
    margin: 0 0 18px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .description > p {
    margin: 0 0 20px;
    font-size: 14px;
    line-height: 1.85;
  }

  .description .availability-note,
  .description .archive-note {
    font-size: 12px;
    color: var(--muted);
    padding-left: 15px;
    border-left: 2px solid var(--line);
  }

  .project-links {
    display: flex;
    gap: 26px;
    flex-wrap: wrap;
    margin-top: 22px;
  }

  .project-navigation {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    border-block: 1px solid var(--line);
    padding: 22px 0;
  }

  .neighbor {
    min-width: 0;
  }

  .neighbor-direction {
    display: flex;
    align-items: center;
    gap: 13px;
    color: var(--muted);
    font-size: 10px;
    margin-bottom: 12px;
  }

  .neighbor-body {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .neighbor-body img {
    width: 92px;
    height: 56px;
    object-fit: cover;
    border-radius: 2px;
  }

  .neighbor-body > span {
    font-family: var(--font-serif);
    font-size: clamp(21px, 2vw, 29px);
    line-height: 1.15;
  }

  .next .neighbor-direction,
  .next .neighbor-body {
    justify-content: flex-end;
    text-align: right;
  }

  .neighbor:hover {
    color: var(--green);
  }

  @media (max-width: 1000px) and (min-width: 701px) {
    .project-content {
      gap: 28px;
      grid-template-columns: 1fr 1fr;
    }

    .project-visual {
      padding: 18px;
    }

    .description > p {
      font-size: 13px;
    }
  }

  @media (max-width: 700px) {
    .project-page {
      padding-top: 8px;
    }

    .project-title {
      display: block;
      margin: 20px 0;
    }

    .eyebrow {
      font-size: 9px;
      margin-bottom: 10px;
    }

    .project-tech {
      display: block;
      margin: 12px 0 0;
      font-size: 10px;
    }

    .project-content {
      grid-template-columns: 1fr;
      gap: 22px;
      margin-bottom: 24px;
    }

    .project-visual {
      padding: 12px;
    }

    .project-visual img {
      height: 145px;
      object-fit: contain;
      box-shadow: none;
    }

    h2 {
      margin-bottom: 10px;
      font-size: 10px;
    }

    .description > p {
      font-size: 13px;
      line-height: 1.75;
      margin-bottom: 14px;
    }

    .description .availability-note,
    .description .archive-note {
      font-size: 11px;
    }

    .project-links {
      margin-top: 15px;
      gap: 24px;
    }

    .project-links :global(.text-link) {
      font-size: 11px;
      padding-bottom: 7px;
    }

    h1 {
      font-size: 39px;
    }

    .project-navigation {
      gap: 24px;
      padding: 18px 0;
    }

    .neighbor-body {
      align-items: center;
      gap: 10px;
    }

    .neighbor-body img {
      width: 48px;
      height: 40px;
    }

    .neighbor-body > span {
      font-size: 17px;
    }

    .neighbor-direction {
      gap: 6px;
      font-size: 9px;
      margin-bottom: 10px;
    }
  }
</style>
