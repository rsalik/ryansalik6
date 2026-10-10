<script lang="ts">
  import { page } from '$app/state';
  import Icon from '$lib/components/Icon.svelte';
</script>

<svelte:head>
  <title>{page.status} — Ryan Salik</title>
</svelte:head>
<main id="main" class="section-shell error-page">
  <p class="eyebrow">{page.status}</p>
  <h1 class="section-title">
    Page <em>unavailable.</em>
  </h1>
  <p>{page.error?.message ?? 'This page is unavailable.'}</p>
  <a class="text-link" href="/">Back to the portfolio <Icon size={18} /></a>
</main>

<style>
  .error-page {
    padding-block: 100px 140px;
  }

  .error-page > p {
    color: var(--muted);
    margin-block: 25px;
  }
</style>
