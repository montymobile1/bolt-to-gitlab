<script lang="ts">
  import { CardFooter } from '$lib/components/ui/card';
  import { AUTHOR, COMPANY_SITE, COMPANY } from '$lib/constants';
</script>

<CardFooter class="text-sm text-slate-400 justify-center">
  <span
    >Created by {AUTHOR}
    of
    <a href={COMPANY_SITE} target="_blank" class="text-slate-200 hover:text-slate-50">{COMPANY}</a
    ></span
  >
</CardFooter>
