<script lang="ts">
  import type { Project } from '$lib/data/projects';
  import Icon from './Icon.svelte';
  let {
    project,
    index,
    featured = false
  }: { project: Project; index: number; featured?: boolean } = $props();
</script>

<a href={`/projects/${project.id}`} class="project-card" class:featured>
  <div class="project-image" class:exogram={project.id === 'exogram'}>
    <img src={project.image} alt={project.imageAlt} loading="lazy" width="1280" height="731" />
    {#if featured}
      <span class="view-project">View project <Icon size={16} /></span>
    {/if}
  </div>
  <div class="project-copy">
    <div class="project-category">
      <span>{String(index + 1).padStart(2, '0')} / {project.category}</span>
      {#if !featured}
        <Icon size={18} />
      {/if}
    </div>
    <h3>
      {project.name}{#if featured}
        <Icon size={24} />
      {/if}
    </h3>
    <p>
      {project.blurb}
    </p>
    <div class="project-stack">{project.stack.join(' / ')}</div>
  </div>
</a>

<style>
  .project-card {
    display: grid;
    grid-template-columns: 128px 1fr;
    gap: 23px;
    border-top: 1px solid var(--line);
    padding: 30px 0;
    align-items: start;
  }

  .project-image {
    background: #e5e9e0;
    overflow: hidden;
    position: relative;
    border-radius: 2px;
  }

  .project-image img {
    width: 100%;
    height: 105px;
    object-fit: cover;
    transition: transform 0.6s;
  }

  .project-category {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 8px;
    color: var(--muted);
    letter-spacing: 1px;
    text-transform: uppercase;
    margin-bottom: 12px;
    align-items: center;
  }

  h3 {
    margin: 0 0 12px;
    font-size: 21px;
    letter-spacing: -0.6px;
    font-weight: 400;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  p {
    font-size: 12px;
    line-height: 1.9;
    color: var(--muted);
    margin: 0 0 17px;
  }

  .project-stack {
    font-size: 9px;
    color: var(--muted);
    letter-spacing: 0.3px;
  }

  .project-card:hover h3 {
    color: var(--green);
  }

  .project-card:hover img {
    transform: scale(1.035);
  }

  .featured {
    display: block;
    padding: 0;
    border: 0;
  }

  .featured .project-image {
    padding: 44px 30px;
    background: #e2e7de;
  }

  .featured .project-image.exogram {
    background: #dce4e3;
  }

  .featured .project-image img {
    height: auto;
    aspect-ratio: 1.75;
    object-fit: cover;
    border-radius: 3px;
    box-shadow: 0 14px 20px -13px #17241e70;
  }

  .featured .project-copy {
    padding: 25px 0 0;
  }

  .featured h3 {
    font-size: 28px;
    margin-bottom: 13px;
  }

  .featured p {
    font-size: 13px;
    line-height: 1.85;
    max-width: 95%;
  }

  .featured .project-category {
    font-size: 9px;
    margin-bottom: 13px;
  }

  .view-project {
    position: absolute;
    bottom: 18px;
    right: 18px;
    background: var(--paper);
    display: flex;
    align-items: center;
    gap: 13px;
    font-size: 10px;
    padding: 12px 16px;
    border-radius: 25px;
    opacity: 0;
    transform: translateY(6px);
    transition: 0.25s;
  }

  .project-card:hover .view-project,
  .project-card:focus-visible .view-project {
    opacity: 1;
    transform: none;
  }

  @media (max-width: 900px) {
    .project-card {
      grid-template-columns: 90px 1fr;
      gap: 17px;
    }

    .project-image img {
      height: 85px;
    }

    .featured .project-image {
      padding: 28px 20px;
    }
  }

  @media (max-width: 600px) {
    .featured .project-image {
      padding: 30px 20px;
    }

    .featured h3 {
      font-size: 25px;
    }

    .featured .project-copy {
      padding-top: 22px;
    }

    .featured p {
      font-size: 13px;
    }

    .project-card:not(.featured) {
      grid-template-columns: 94px 1fr;
      padding: 26px 0;
    }

    h3 {
      font-size: 20px;
    }

    .project-category {
      font-size: 8px;
      line-height: 1.5;
    }

    p {
      font-size: 12px;
    }
  }
</style>
