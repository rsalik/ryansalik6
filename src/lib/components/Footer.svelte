<!-- @component Render the site's contact links and copyright in the shared footer. -->
<script lang="ts">
  import Icon from './Icon.svelte';
  import { contactLinks } from '$lib/data/projects';
</script>

<footer id="contact" class="contact-section section-shell">
  <div class="eyebrow">
    <span>03 / CONTACT</span>
  </div>
  <div class="contact-main">
    <h2>Get in touch.</h2>
    <div class="contact-links">
      {#each contactLinks as link}
        <a
          href={link.label === 'Email' ? link.href.replace('@', '%40') : link.href}
          class="contact-link"
        >
          <span class="contact-identity">
            <Icon name={link.label === 'Email' ? 'email' : 'github'} size={22} />
            <span>
              <small>{link.label}</small>
              {#if link.label === 'Email'}
                {@const [localPart, domain] = link.text.split('@')}
                <span aria-label={link.text}>{localPart}@{domain}</span>
              {:else}
                {link.text}
              {/if}
            </span>
          </span>
          <Icon size={23} />
        </a>
      {/each}
    </div>
  </div>
  <div class="footer-bottom">
    <span>© {new Date().getFullYear()} Ryan Salik</span>
    <a href="#top">Back to top ↑</a>
  </div>
</footer>

<style>
  .contact-section {
    padding-top: 74px;
    padding-bottom: 28px;
  }

  .eyebrow {
    display: flex;
    justify-content: space-between;
  }

  .contact-main {
    display: flex;
    justify-content: space-between;
    padding: 46px 0 75px;
    gap: 70px;
  }

  h2 {
    font-family: var(--font-serif);
    font-size: clamp(42px, 4.5vw, 65px);
    line-height: 1.14;
    letter-spacing: -1.9px;
    font-weight: 300;
    margin: 0;
  }

  h2 em {
    font-weight: inherit;
    color: var(--green);
  }

  .contact-links {
    width: min(440px, 45%);
  }

  .contact-link {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid var(--line);
    font-size: 16px;
    gap: 20px;
  }

  .contact-link small {
    display: block;
    font-size: 11px;
    margin-bottom: 8px;
    color: var(--muted);
  }

  .contact-identity {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .contact-identity :global(svg) {
    flex-shrink: 0;
    color: var(--muted);
  }

  .contact-link:hover {
    color: var(--green);
  }

  .footer-bottom {
    display: flex;
    justify-content: space-between;
    border-top: 1px solid var(--line);
    padding-top: 24px;
    color: var(--muted);
    font-size: 11px;
    gap: 20px;
  }

  @media (max-width: 700px) {
    .contact-main {
      display: block;
      padding: 35px 0 48px;
    }

    .contact-links {
      margin-top: 30px;
      width: 100%;
    }

    .contact-section {
      padding-top: 45px;
    }

    .footer-bottom {
      flex-wrap: wrap;
      font-size: 10px;
    }

    .contact-link {
      font-size: 14px;
    }
  }
</style>
