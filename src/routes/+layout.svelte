<!-- @component Render shared navigation, page content, and the site-wide contact footer. -->
<script lang="ts">
  import '../app.css';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import { page } from '$app/state';
  let { children } = $props();
</script>

<a class="skip-link" href="#main">Skip to content</a>
<div id="top"></div>
{#if page.url.pathname !== '/'}
  <Header />
{/if}

{@render children()}
<Footer />
