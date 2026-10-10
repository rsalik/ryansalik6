<script lang="ts">
  let {
    name = 'arrow',
    size = 20
  }: {
    name?:
      | 'arrow'
      | 'down'
      | 'grid'
      | 'pause'
      | 'play'
      | 'next'
      | 'close'
      | 'check'
      | 'back'
      | 'email'
      | 'github';
    size?: number;
  } = $props();
</script>

<svg
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.5"
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#if name === 'arrow'}
    <path d="M5 19 19 5M5 5h14v14" />
  {:else if name === 'down'}
    <path d="m7 10 5 5 5-5" />
  {:else if name === 'grid'}
    <rect x="4" y="4" width="6" height="6" rx="1" />
    <rect x="14" y="4" width="6" height="6" rx="1" />
    <rect x="4" y="14" width="6" height="6" rx="1" />
    <rect x="14" y="14" width="6" height="6" rx="1" />
  {:else if name === 'pause'}
    <path d="M9 5v14M15 5v14" />
  {:else if name === 'play'}
    <path d="m8 5 11 7-11 7Z" />
  {:else if name === 'next'}
    <path d="M4 12h16m-6-6 6 6-6 6" />
  {:else if name === 'back'}
    <path d="M20 12H4m6-6-6 6 6 6" />
  {:else if name === 'email'}
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 6 9 7 9-7" />
  {:else if name === 'github'}
    <path
      d="M9 19c-4 1.2-4-2-6-2.5M15 22v-3.5c0-1-.1-1.8-.6-2.4 3.1-.4 6.3-1.5 6.3-6.8 0-1.5-.5-2.7-1.4-3.7.2-.4.6-1.8-.1-3.6 0 0-1.1-.4-3.8 1.4a12.5 12.5 0 0 0-6.8 0C5.9 1.6 4.8 2 4.8 2c-.7 1.8-.3 3.2-.1 3.6-.9 1-1.4 2.2-1.4 3.7 0 5.3 3.2 6.4 6.3 6.8-.5.6-.6 1.4-.6 2.4V22"
    />
  {:else if name === 'close'}
    <path d="m6 6 12 12M6 18 18 6" />
  {:else if name === 'check'}
    <path d="m5 12 4 4L19 6" />
  {/if}
</svg>
