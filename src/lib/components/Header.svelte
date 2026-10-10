<script lang="ts">
  import Icon from './Icon.svelte';
</script>

<header class="site-header">
  <a class="wordmark" href="/" aria-label="Ryan Salik home">Ryan Salik</a>
  <nav aria-label="Main navigation">
    <a href="/#work">Software</a>
    <a href="/#photography">Photography</a>
    <a href="/#contact">Contact <Icon name="arrow" size={14} /></a>
  </nav>
</header>

<style>
  .site-header {
    height: 94px;
    padding: 0 var(--edge);
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1800px;
    margin: auto;
  }

  .wordmark {
    font-family: var(--font-serif);
    font-size: 32px;
    letter-spacing: -1.6px;
  }

  nav {
    display: flex;
    gap: 38px;
    align-items: center;
  }

  nav a {
    font-size: 13px;
    display: flex;
    gap: 10px;
    align-items: center;
    padding: 12px 0;
  }

  nav a:hover {
    color: var(--green);
  }

  @media (max-width: 600px) {
    .site-header {
      height: 78px;
    }

    .wordmark {
      font-size: 27px;
    }

    nav {
      gap: 19px;
    }

    nav a {
      font-size: 11px;
    }

    nav a:last-child {
      gap: 5px;
    }
  }

  @media (max-width: 370px) {
    nav {
      gap: 12px;
    }

    nav a:last-child :global(svg) {
      display: none;
    }
  }
</style>
