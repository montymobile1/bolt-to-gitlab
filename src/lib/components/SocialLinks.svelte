<script lang="ts">
  import {  Gitlab } from 'lucide-svelte';
  import { Button } from '$lib/components/ui/button';

  export let GITLAB_LINK: string;

  function openLink(url: string) {
    chrome.tabs.create({ url });
  }
</script>

<div class="flex justify-center space-x-4">
  <Button
    variant="outline"
    class="border-slate-800 hover:bg-slate-800 text-slate-200"
    on:click={() => openLink(GITLAB_LINK)}
  >
    <Gitlab class="w-4 h-4" />
  </Button>
</div>
