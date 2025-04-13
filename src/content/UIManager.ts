import type { UploadStatusState } from '$lib/types';
import { SettingsService } from '../services/settings';
import type { MessageHandler } from './MessageHandler';
import UploadStatus from './UploadStatus.svelte';
import Notification from './Notification.svelte';

interface NotificationOptions {
  type: 'info' | 'error' | 'success';
  message: string;
  duration?: number;
}

export class UIManager {
  private static instance: UIManager | null = null;
  private uploadStatusComponent: UploadStatus | null = null;
  private uploadButton: HTMLElement | null = null;
  private observer: MutationObserver | null = null;
  private notificationComponent: Notification | null = null;
  private isGitlabUpload = false;
  private messageHandler: MessageHandler;

  private constructor(messageHandler: MessageHandler) {
    this.messageHandler = messageHandler;
    this.initializeUI();
    this.setupClickListeners();
    this.setupMutationObserver();
  }

  static getInstance(messageHandler?: MessageHandler): UIManager {
    if (!UIManager.instance && messageHandler) {
      UIManager.instance = new UIManager(messageHandler);
    } else if (!UIManager.instance) {
      throw new Error('UIManager must be initialized with a MessageHandler first');
    }
    return UIManager.instance;
  }

  // Method to explicitly initialize with MessageHandler
  static initialize(messageHandler: MessageHandler): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager(messageHandler);
    }
    return UIManager.instance;
  }

  // Reset instance (useful for testing or cleanup)
  static resetInstance(): void {
    if (UIManager.instance) {
      UIManager.instance.cleanup();
      UIManager.instance = null;
    }
  }

  public showNotification(options: NotificationOptions): void {
    // Cleanup existing notification if any
    this.notificationComponent?.$destroy();

    // Create container for notification
    const container = document.createElement('div');
    container.id = 'bolt-to-gitlab-notification-container';
    document.body.appendChild(container);

    // Create new notification component
    this.notificationComponent = new Notification({
      target: container,
      props: {
        type: options.type,
        message: options.message,
        duration: options.duration || 5000,
        onClose: () => {
          this.notificationComponent?.$destroy();
          this.notificationComponent = null;
          container.remove();
        },
      },
    });
  }

  private async initializeUI() {
    console.log('🔊 Initializing UI');
    await this.initializeUploadButton();
    this.initializeUploadStatus();
  }

  private initializeUploadStatus() {
    console.log('🔊 Initializing upload status');
    // Clean up existing instance if any
    if (this.uploadStatusComponent) {
      console.log('Destroying existing upload status component');
      this.uploadStatusComponent.$destroy();
      this.uploadStatusComponent = null;
    }

    // Remove existing container if any
    const existingContainer = document.getElementById('bolt-to-gitlab-upload-status-container');
    if (existingContainer) {
      console.log('Removing existing upload status container');
      existingContainer.remove();
    }

    // Create new container and component
    const target = document.createElement('div');
    target.id = 'bolt-to-gitlab-upload-status-container';

    // Wait for document.body to be available
    if (document.body) {
      console.log('Appending upload status container to body');
      document.body.appendChild(target);
    } else {
      // If body isn't available, wait for it
      console.log('Waiting for body to be available');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('Appending upload status container to body');
        document.body?.appendChild(target);
      });
    }

    this.uploadStatusComponent = new UploadStatus({
      target,
    });
  }

  private async initializeUploadButton() {
    console.log('🔊 Initializing upload button');
    const buttonContainer = document.querySelector('div.flex.grow-1.basis-60 div.flex.gap-2');
    console.log('Button container found:', !!buttonContainer);

    const existingButton = document.querySelector('[data-gitlab-upload]');
    console.log('Existing Gitlab button found:', !!existingButton);

    if (!buttonContainer || existingButton) {
      console.log('Exiting initializeUploadButton early');
      return;
    }

    const settings = await SettingsService.getGitlabSettings();
    const button = this.createGitlabButton();
    this.updateButtonState(settings.isSettingsValid);
    this.uploadButton = button;

    const deployButton = buttonContainer.querySelector('button:last-child');
    if (deployButton) {
      deployButton.before(button);
    }

    console.log('Upload button initialized');
  }

  private createGitlabButton(): HTMLButtonElement {
    const button = document.createElement('button');
    button.setAttribute('data-gitlab-upload', 'true');
    button.setAttribute('data-testid', 'gitlab-upload-button');
    button.className = [
      'rounded-md',
      'items-center',
      'justify-center',
      'outline-accent-600',
      'px-3',
      'py-1.25',
      'disabled:cursor-not-allowed',
      'text-xs',
      'bg-bolt-elements-button-secondary-background',
      'text-bolt-elements-button-secondary-text',
      'enabled:hover:bg-bolt-elements-button-secondary-backgroundHover',
      'flex',
      'gap-1.7',
      'transition-opacity',
    ].join(' ');

    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" style="margin-right: 2px;">
        <path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
      </svg>
      Gitlab
    `;

    button.addEventListener('click', async () => {
      await this.handleGitlabButtonClick();
    });

    console.log('Gitlab button created');

    return button;
  }

  private async handleGitlabButtonClick() {
    console.log('Handling Gitlab button click');
    const settings = await SettingsService.getGitlabSettings();
    if (!settings.isSettingsValid) {
      this.showSettingsNotification();
      return;
    }

    const { confirmed, commitMessage } = await this.showGitlabConfirmation(
      settings.gitlabSettings?.projectSettings || {}
    );
    if (!confirmed) return;

    try {
      await this.findAndClickDownloadButton();

      // Update button state to processing
      if (this.uploadButton) {
        this.uploadButton.innerHTML = `
          <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Pushing to Gitlab...
        `;
        (this.uploadButton as HTMLButtonElement).disabled = true;
      }

      this.isGitlabUpload = true;
      this.messageHandler.sendCommitMessage(commitMessage || 'Commit from Bolt to Gitlab');

      this.findAndClickDownloadButton(); // This will close the dropdown
    } catch (error) {
      console.error('Error during Gitlab upload:', error);
      throw new Error('Failed to trigger download. The page structure may have changed.');
    }
  }

  private findAndClickExportButton() {
    const exportButton = Array.from(document.querySelectorAll('button[aria-haspopup="menu"]')).find(
      (btn) => btn.textContent?.includes('Export') && btn.querySelector('.i-ph\\:export')
    ) as HTMLButtonElement;

    if (!exportButton) {
      throw new Error('Export button not found');
    }
    console.log('Found export button:', exportButton);

    // Dispatch keydown event to open dropdown
    const keydownEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      bubbles: true,
      cancelable: true,
    });
    exportButton.dispatchEvent(keydownEvent);
    console.log('Dispatched keydown to export button');
  }

  async findAndClickDownloadButton() {
    this.findAndClickExportButton();

    // Wait a bit for the dropdown content to render
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Find the dropdown content
    const dropdownContent = document.querySelector('[role="menu"], [data-radix-menu-content]');
    if (!dropdownContent) {
      throw new Error('Dropdown content not found');
    }

    // Find download button
    const downloadButton = Array.from(dropdownContent.querySelectorAll('button')).find((button) => {
      const hasIcon = button.querySelector('.i-ph\\:download-simple');
      const hasText = button.textContent?.toLowerCase().includes('download');
      return hasIcon || hasText;
    });

    if (!downloadButton) {
      throw new Error('Download button not found in dropdown');
    }

    console.log('Found download button, clicking...');
    downloadButton.click();
  }

  // Function to show confirmation dialog
  private showGitlabConfirmation = (
    projectSettings: Record<string, { repoName: string; branch: string }>
  ): Promise<{ confirmed: boolean; commitMessage?: string }> => {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.style.zIndex = '9999';
      overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      overlay.className = ['fixed', 'inset-0', 'flex', 'items-center', 'justify-center'].join(' ');

      const dialog = document.createElement('div');
      dialog.style.zIndex = '10000';
      dialog.style.width = '320px'; // Set fixed width
      dialog.style.backgroundColor = '#0f172a'; // Match bg-slate-900
      dialog.className = [
        'p-6',
        'rounded-lg',
        'shadow-xl',
        'mx-4',
        'space-y-4',
        'border',
        'border-slate-700',
        'relative',
      ].join(' ');

      dialog.innerHTML = `
        <h3 class="text-lg font-semibold text-white">Confirm Gitlab Upload</h3>
        <p class="text-slate-300 text-sm">Are you sure you want to upload this project to Gitlab? <br />
          <span class="font-mono">${projectSettings.repoName} / ${projectSettings.branch}</span>
        </p>
        <div class="mt-4">
          <label for="commit-message" class="block text-sm text-slate-300 mb-2">Commit message (optional)</label>
          <input 
            type="text" 
            id="commit-message" 
            placeholder="Commit from Bolt to Gitlab"
            class="w-full px-3 py-2 text-sm rounded-md bg-slate-800 text-white border border-slate-700 focus:border-blue-500 focus:outline-none"
          >
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button class="px-4 py-2 text-sm rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700" id="cancel-upload">
            Cancel
          </button>
          <button class="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700" id="confirm-upload">
            Upload
          </button>
        </div>
      `;

      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Handle clicks
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          document.body.removeChild(overlay);
          resolve({ confirmed: false });
        }
      });

      dialog.querySelector('#cancel-upload')?.addEventListener('click', () => {
        document.body.removeChild(overlay);
        resolve({ confirmed: false });
      });

      dialog.querySelector('#confirm-upload')?.addEventListener('click', () => {
        const commitMessage =
          (dialog.querySelector('#commit-message') as HTMLInputElement)?.value ||
          'Commit from Bolt to Gitlab';
        document.body.removeChild(overlay);
        resolve({ confirmed: true, commitMessage });
      });
    });
  };

  // Also update the notification z-index
  private showSettingsNotification = () => {
    const notification = document.createElement('div');
    notification.style.zIndex = '10000';
    notification.className = [
      'fixed',
      'top-4',
      'right-4',
      'p-4',
      'bg-red-500',
      'text-white',
      'rounded-md',
      'shadow-lg',
      'flex',
      'items-center',
      'gap-2',
      'text-sm',
    ].join(' ');

    notification.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>
        Please configure your Gitlab settings first. 
        <button class="text-white font-medium hover:text-white/90 underline underline-offset-2">Open Settings</button>
      </span>
    `;

    // Add click handler for settings button
    const settingsButton = notification.querySelector('button');
    settingsButton?.addEventListener('click', () => {
      this.messageHandler.sendMessage('OPEN_SETTINGS');
      document.body.removeChild(notification);
    });

    // Add close button
    const closeButton = document.createElement('button');
    closeButton.className = 'ml-2 text-white hover:text-white/90 font-medium text-lg leading-none';
    closeButton.innerHTML = '×';
    closeButton.addEventListener('click', () => {
      document.body.removeChild(notification);
    });
    notification.appendChild(closeButton);

    // Add to body and remove after 5 seconds
    document.body.appendChild(notification);
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 5000);
  };

  public updateUploadStatus(status: UploadStatusState) {
    // console.log('🔊 Updating upload status:', status);
    if (!this.uploadStatusComponent) {
      console.log('🔊 Upload status component not found, initializing');
      this.initializeUploadStatus();
    }

    // console.log('🔊 Setting upload status:', status);
    this.uploadStatusComponent?.$set({ status });

    // Reset Gitlab button when upload is complete
    if (status.status !== 'uploading' && this.isGitlabUpload && this.uploadButton) {
      this.isGitlabUpload = false;
      this.uploadButton.innerHTML = `
   
          <svg fill="#ffffff"" width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M20.892 9.889a.664.664 0 0 0-.025-.087l-2.104-6.479a.84.84 0 0 0-.8-.57.822.822 0 0 0-.789.575l-2.006 6.175H8.834L6.826 3.327a.823.823 0 0 0-.786-.575h-.006a.837.837 0 0 0-.795.575L3.133 9.815c0 .005-.005.01-.007.016l-1.067 3.281a1.195 1.195 0 0 0 .435 1.34l9.227 6.706c.167.121.393.12.558-.003l9.229-6.703a1.2 1.2 0 0 0 .435-1.34l-1.051-3.223zM17.97 3.936l1.809 5.566H16.16l1.81-5.566zm-11.94 0 1.812 5.566H4.228L6.03 3.936zm-2.982 9.752a.253.253 0 0 1-.093-.284l.793-2.437 5.817 7.456-6.517-4.735zm1.499-3.239h3.601l2.573 7.916-6.174-7.916zm7.452 8.794-2.856-8.798h5.718l-1.792 5.515-1.07 3.283zm1.282-.877 2.467-7.588.106-.329h3.604l-5.586 7.156-.591.761zm7.671-4.678-6.519 4.733.022-.029 5.794-7.425.792 2.436a.25.25 0 0 1-.089.285z"/></svg>
        Gitlab
      `;
      (this.uploadButton as HTMLButtonElement).disabled = false;
    }
  }

  public updateButtonState(isValid: boolean) {
    if (this.uploadButton) {
      this.uploadButton.classList.toggle('disabled', !isValid);
      // Update other button states as needed
    }
  }

  private setupClickListeners() {
    let clickSource: HTMLElement | null = null;

    document.addEventListener(
      'click',
      async (e) => {
        const target = e.target as HTMLElement;
        clickSource = target;

        if (target instanceof HTMLElement) {
          const downloadElement = target.closest('a[download], button[download]');
          if (downloadElement) {
            const isFromGitlabButton = target.closest('[data-gitlab-upload]') !== null;

            if (isFromGitlabButton || this.isGitlabUpload) {
              e.preventDefault();
              e.stopPropagation();
              await this.handleDownloadInterception();
            }
          }
        }
      },
      true
    );
  }

  private async handleDownloadInterception() {
    const downloadLinks = document.querySelectorAll('a[download][href^="blob:"]');
    for (const link of Array.from(downloadLinks)) {
      const blobUrl = (link as HTMLAnchorElement).href;
      await this.handleBlobUrl(blobUrl);
    }
  }

  private async handleBlobUrl(blobUrl: string) {
    try {
      const response = await fetch(blobUrl);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const blob = await response.blob();
      const base64data = await this.blobToBase64(blob);

      if (base64data) {
        this.messageHandler.sendZipData(base64data);
      }
    } catch (error) {
      console.error('Error processing blob:', error);
    }
  }

  private blobToBase64(blob: Blob): Promise<string | null> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64data = reader.result?.toString().split(',')[1] || null;
        resolve(base64data);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  }

  private setupMutationObserver() {
    let timeoutId: number;
    let retryCount = 0;
    const maxRetries = 3;

    const attemptInitialization = () => {
      const button = document.querySelector('[data-gitlab-upload]');
      const buttonContainer = document.querySelector('div.flex.grow-1.basis-60 div.flex.gap-2');

      if (!button && buttonContainer) {
        this.initializeUploadButton();
        retryCount = 0; // Reset count on success
      } else if (!buttonContainer && retryCount < maxRetries) {
        retryCount++;
        timeoutId = window.setTimeout(attemptInitialization, 1000); // 1 second between retries
      } else if (retryCount >= maxRetries) {
        this.showNotification({
          type: 'error',
          message:
            'Failed to initialize Gitlab upload button. Please try to refresh the page. If the issue persists, please submit an issue on Gitlab.',
          duration: 7000,
        });
        retryCount = 0; // Reset for future attempts
      }
    };

    this.observer = new MutationObserver(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(attemptInitialization, 500);
    });

    // Wait for document.body to be available
    if (document.body) {
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } else {
      // If body isn't available, wait for it
      document.addEventListener('DOMContentLoaded', () => {
        this.observer?.observe(document.body, {
          childList: true,
          subtree: true,
        });
      });
    }
  }

  public cleanup() {
    this.observer?.disconnect();
    if (this.uploadStatusComponent) {
      this.uploadStatusComponent.$destroy();
      this.uploadStatusComponent = null;
    }
    if (this.notificationComponent) {
      this.notificationComponent.$destroy();
      this.notificationComponent = null;
    }
    this.uploadButton?.remove();
    this.uploadButton = null;

    // Clean up notification container if it exists
    const notificationContainer = document.getElementById('bolt-to-gitlab-notification-container');
    notificationContainer?.remove();
  }

  public reinitialize() {
    console.log('🔊 Reinitializing UI manager');
    this.cleanup();
    this.initializeUI();
  }
}
