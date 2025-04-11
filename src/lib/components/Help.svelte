<script lang="ts">
  import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
  } from '$lib/components/ui/card';
  import { CREATE_TOKEN_URL } from '../../services/GitlabService';
  import { ChevronDown } from 'lucide-svelte';

  let openSections = {
    gettingStarted: false,
    tokenGuide: false,
    privateRepo: false,
    security: false,
  };

  type SectionKey = keyof typeof openSections;

  function toggleSection(section: SectionKey) {
    openSections[section] = !openSections[section];
  }
</script>

<Card class="border-slate-800 bg-slate-900">
  <CardHeader>
    <CardTitle class="text-xl">✨ Help & Documentation</CardTitle>
    <CardDescription class="text-slate-400">
      Learn how to use Bolt to GitLab effectively
    </CardDescription>
  </CardHeader>
  <CardContent class="space-y-4">
    <!-- Getting Started Section -->
    <div class="border border-slate-800 rounded-lg overflow-hidden">
      <button
        class="w-full p-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
        on:click={() => toggleSection('gettingStarted')}
      >
        <h3 class="text-base font-semibold text-slate-200 text-left">🚀 Getting Started</h3>
        <ChevronDown
          size={20}
          class={`text-slate-400 transition-transform duration-200 ${openSections.gettingStarted ? 'rotate-180' : ''}`}
        />
      </button>
      {#if openSections.gettingStarted}
        <div class="p-4 space-y-2">
          <p class="text-sm text-slate-400">1. Click the extension icon in your browser toolbar</p>
          <p class="text-sm text-slate-400">
            2. Follow the popup instructions to connect your GitLab account
          </p>
          <p class="text-sm text-slate-400">
            3. Once connected, you can use Bolt to manage and sync GitLab repositories from any bolt.new page
          </p>
        </div>
      {/if}
    </div>

    <!-- GitLab Token Guide Section -->
    <div class="border border-slate-800 rounded-lg overflow-hidden">
      <button
        class="w-full p-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
        on:click={() => toggleSection('tokenGuide')}
      >
        <h3 class="text-base font-semibold text-slate-200 text-left">🔑 GitLab Token Guide</h3>
        <ChevronDown
          size={20}
          class={`text-slate-400 transition-transform duration-200 ${openSections.tokenGuide ? 'rotate-180' : ''}`}
        />
      </button>
      {#if openSections.tokenGuide}
        <div class="p-4 space-y-3">
          <div class="rounded-md bg-slate-800 p-4">
            <h4 class="mb-2 font-medium text-slate-200">🎯 Personal Access Token</h4>
            <p class="mb-2 text-sm text-slate-400">
              Required to authenticate and access private repositories:
            </p>
            <ol class="ml-4 list-decimal text-sm text-slate-400">
              <li>
                Visit the <a
                  href={CREATE_TOKEN_URL}
                  target="_blank"
                  class="text-blue-400 hover:underline">GitLab token creation page</a>
              </li>
              <li>Select scopes: <code>api</code>, <code>read_repository</code>, <code>write_repository</code></li>
              <li>Click "Create personal access token" and copy the token</li>
              <li>Paste it into the "GitLab Token" field in your Bolt Settings</li>
            </ol>
          </div>

        </div>
      {/if}
    </div>

    <!-- Private Repository Import Section -->
    <div class="border border-slate-800 rounded-lg overflow-hidden">
      <button
        class="w-full p-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
        on:click={() => toggleSection('privateRepo')}
      >
        <h3 class="text-base font-semibold text-slate-200 text-left">
          🔒 Private Repository Import
        </h3>
        <ChevronDown
          size={20}
          class={`text-slate-400 transition-transform duration-200 ${openSections.privateRepo ? 'rotate-180' : ''}`}
        />
      </button>
      {#if openSections.privateRepo}
        <div class="p-4">
          <div class="rounded-md bg-slate-800/50 p-3 text-sm text-slate-400">
            <p>When importing private repositories from GitLab:</p>
            <ol class="ml-4 mt-2 list-decimal">
              <li>Bolt clones your repository in the background</li>
              <li>Only read access is used during the import process</li>
              <li>Your original repository remains untouched</li>
            </ol>
            <div class="mt-3 p-2 bg-amber-900/30 rounded border border-amber-700/30">
              <p class="text-amber-400 font-medium">Important:</p>
              <p class="mt-1">
                After importing a private repo, go to the Settings tab and select the repository to ensure Bolt syncs changes correctly.
              </p>
            </div>
            <p class="mt-2 text-amber-400">
              Note: Use a token with appropriate read/write permissions for full functionality.
            </p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Security & Privacy Section -->
    <div class="border border-slate-800 rounded-lg overflow-hidden">
      <button
        class="w-full p-4 flex items-center justify-between bg-slate-800/50 hover:bg-slate-800/70 transition-colors"
        on:click={() => toggleSection('security')}
      >
        <h3 class="text-base font-semibold text-slate-200 text-left">🛡️ Security & Privacy</h3>
        <ChevronDown
          size={20}
          class={`text-slate-400 transition-transform duration-200 ${openSections.security ? 'rotate-180' : ''}`}
        />
      </button>
      {#if openSections.security}
        <div class="p-4">
          <div class="rounded-md bg-slate-800/50 p-3 text-sm text-slate-400">
            <p class="font-medium mb-2">Token Usage & Security:</p>
            <ul class="space-y-2">
              <li>• Your GitLab Token is used exclusively for GitLab API operations</li>
              <li>• No third-party servers are connected to this extension</li>
              <li>• Tokens are stored securely in your browser's local storage</li>
              <li>• All operations are performed directly between your browser and GitLab's API</li>
            </ul>
            <div class="mt-3 p-2 bg-amber-900/30 rounded border border-amber-700/30">
              <p class="text-amber-400 font-medium">Security Notice:</p>
              <p class="mt-1">
                Your GitLab Token grants access to your repositories. It is your responsibility to:
              </p>
              <ul class="mt-2 ml-4 space-y-1 text-amber-400/90">
                <li>• Keep your token secure and private</li>
                <li>• Never share your token with others</li>
                <li>• Regularly rotate your tokens for enhanced security</li>
                <li>• Revoke tokens immediately if compromised</li>
              </ul>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </CardContent>
</Card>
