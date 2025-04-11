import { GitlabService } from '../services/GitlabService';
import type { Message, MessageType, Port, UploadStatusState } from '../lib/types';
import { StateManager } from './StateManager';
import { ZipHandler } from '../services/zipHandler';
import { BackgroundTempRepoManager } from './TempRepoManager';

export class BackgroundService {
  private stateManager: StateManager;
  private zipHandler: ZipHandler | null;
  private ports: Map<number, Port>;
  private gitlabService: GitlabService | null;
  private tempRepoManager: BackgroundTempRepoManager | null = null;
  private pendingCommitMessage: string;
  private storageListener:
    | ((changes: { [key: string]: chrome.storage.StorageChange }, namespace: string) => void)
    | null = null;

  constructor() {
    console.log('🚀 Background service initializing...');
    this.stateManager = StateManager.getInstance();
    this.ports = new Map();
    this.gitlabService = null;
    this.zipHandler = null;
    this.pendingCommitMessage = 'Commit from Bolt to Gitlab';
    this.initialize();
  }

  // this.initializeListeners();
  // this.initializeStorageListener();

  private async initialize(): Promise<void> {
    const gitlabService = await this.initializegitlabService();
    this.setupZipHandler(gitlabService!);
    if (gitlabService) {
      const settings = await this.stateManager.getGitlabSettings();
      if (settings?.gitlabSettings?.repoOwner) {
        this.tempRepoManager = new BackgroundTempRepoManager(
          gitlabService,
          settings.gitlabSettings.repoOwner,
          (status) => this.broadcastStatus(status)
        );
      }
    }
    this.setupConnectionHandlers();
    this.setupStorageListener();

  }

  private async initializegitlabService(): Promise<GitlabService | null> {
    try {
      const settings = await this.stateManager.getGitlabSettings();

      if (
        settings &&
        settings.gitlabSettings &&
        settings.gitlabSettings.gitlabToken &&
        settings.gitlabSettings.repoOwner
      ) {
        console.log('✅ Valid settings found, initializing Gitlab service', settings);
        this.gitlabService = new GitlabService(settings.gitlabSettings.gitlabToken);

      } else {
        console.log('❌ Invalid or incomplete settings');
        this.gitlabService = null;
      }
    } catch (error) {
      console.error('Failed to initialize Gitlab service:', error);
      this.gitlabService = null;
    }
    return this.gitlabService;
  }

  private setupZipHandler(gitlabService: GitlabService) {
    this.zipHandler = new ZipHandler(gitlabService, (status) => this.broadcastStatus(status));
  }

  private broadcastStatus(status: UploadStatusState) {
    for (const [tabId, port] of this.ports) {
      this.sendResponse(port, {
        type: 'UPLOAD_STATUS',
        status,
      });
    }
  }

  private setupConnectionHandlers(): void {
    chrome.runtime.onConnect.addListener((port: Port) => {
      const tabId = port.sender?.tab?.id ?? -1; // Use -1 for popup

      if (!['bolt-content', 'popup'].includes(port.name)) {
        return;
      }

      console.log('📝 New connection from:', port.name, 'tabId:', tabId);
      this.ports.set(tabId, port);

      port.onDisconnect.addListener(() => {
        console.log('🔌 Port disconnected:', tabId);
        this.ports.delete(tabId);
      });

      port.onMessage.addListener(async (message: Message) => {
        console.log('📥 Received port message:', { source: port.name, type: message.type });
        await this.handlePortMessage(tabId, message);
      });
    });

    // Clean up when tabs are closed
    chrome.tabs.onRemoved.addListener((tabId) => {
      this.ports.delete(tabId);
    });

    // Handle URL updates for project ID
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      if (tab.url?.includes('bolt.new/~/')) {
        const projectId = tab.url.match(/bolt\.new\/~\/([^/]+)/)?.[1] || null;
        if (projectId) {
          await this.stateManager.setProjectId(projectId);
        }
      }
    });
  }

  private setupStorageListener(): void {
    // Remove any existing listener
    if (this.storageListener) {
      chrome.storage.onChanged.removeListener(this.storageListener);
    }

    // Create new listener and store reference
    this.storageListener = async (changes, namespace) => {
      if (namespace === 'sync') {
        const settingsChanged = ['gitlabToken', 'repoOwner', 'repoName', 'branch'].some(
          (key) => key in changes
        );

        if (settingsChanged) {
          console.log('🔄 Gitlab settings changed, reinitializing Gitlab service...');
          const gitlabService = await this.initializegitlabService();
          if (gitlabService) {
            console.log('🔄 Gitlab service reinitialized, reinitializing ZipHandler...');
            this.setupZipHandler(gitlabService);
          }
        }
      }
    };

    // Add the listener
    chrome.storage.onChanged.addListener(this.storageListener);
  }

  private async handlePortMessage(tabId: number, message: Message): Promise<void> {
    const port = this.ports.get(tabId);
    if (!port) return;

    try {
      switch (message.type) {
        case 'ZIP_DATA':
          await this.handleZipData(tabId, message.data);
          break;

        case 'SET_COMMIT_MESSAGE':
          console.log('Setting commit message:', message.data.message);
          if (message.data && message.data.message) {
            this.pendingCommitMessage = message.data.message;
          }
          break;

        case 'OPEN_SETTINGS':
          console.log('Opening settings popup');
          chrome.action.openPopup();
          break;

        case 'IMPORT_PRIVATE_REPO':
          console.log('🔄 Processing private repo import:', message.data.repoName);
          if (!this.tempRepoManager) {
            throw new Error('Temp repo manager not initialized');
          }
          await this.tempRepoManager.handlePrivateRepoImport(message.data.repoName);
          console.log('✅ Private repo import completed');
          break;
        case 'DELETE_TEMP_REPO':
          await this.tempRepoManager?.cleanupTempRepos(true);
          console.log('✅ Temp repo cleaned up');
          break;

        case 'DEBUG':
          console.log(`[Content Debug] ${message.message}`);
          break;

        case 'CONTENT_SCRIPT_READY':
          console.log('Content script is ready');
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error(`Error handling message ${message.type}:`, error);
      this.sendResponse(port, {
        type: 'UPLOAD_STATUS',
        status: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      });
    }
  }

  private async handleZipData(tabId: number, base64Data: string): Promise<void> {
    console.log('🔄 Handling ZIP data for tab:', tabId);
    const port = this.ports.get(tabId);
    if (!port) return;

    try {
      if (!this.gitlabService) {
        throw new Error('Gitlab service is not initialized. Please check your Gitlab settings.');
      }

      if (!this.zipHandler) {
        throw new Error('Zip handler is not initialized.');
      }

      const projectId = await this.stateManager.getProjectId();
      if (!projectId) {
        throw new Error('Project ID is not set.');
      }

      try {
        // Convert base64 to blob
        const binaryStr = atob(base64Data);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/zip' });

        // Process the ZIP file
        await this.withTimeout(
          this.zipHandler.processZipFile(blob, projectId, this.pendingCommitMessage),
          2 * 60 * 1000, // 2 minutes timeout
          'Processing ZIP file timed out'
        );

        // Reset commit message after successful upload
        this.pendingCommitMessage = 'Commit from Bolt to Gitlab';

        this.sendResponse(port, {
          type: 'UPLOAD_STATUS',
          status: { status: 'success', message: 'Upload completed successfully', progress: 100 },
        });
      } catch (decodeError) {
        const errorMessage =
          decodeError instanceof Error ? decodeError.message : String(decodeError);
        const isGitlabError = errorMessage.includes('Gitlab API Error');

        if (isGitlabError) {
          // Extract the original Gitlab error message if available
          const originalMessage =
            (decodeError as any).originalMessage || 'Gitlab authentication or API error occurred';

          throw new Error(`Gitlab Error: ${originalMessage}`);
        } else {
          throw new Error(
            `Failed to process ZIP data. Please try reloading the page. ` +
              `If the issue persists, please open a Gitlab issue.`
          );
        }
      }
    } catch (error) {
      console.error('Error processing ZIP:', error);
      this.sendResponse(port, {
        type: 'UPLOAD_STATUS',
        status: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      });
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    ms: number,
    timeoutMessage: string
  ): Promise<T> {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), ms)
    );
    return Promise.race([promise, timeout]);
  }

  private sendResponse(
    port: Port,
    message: { type: MessageType; status?: UploadStatusState }
  ): void {
    try {
      port.postMessage(message);
    } catch (error) {
      console.error('Error sending response:', error);
    }
  }

  public destroy(): void {
    if (this.storageListener) {
      chrome.storage.onChanged.removeListener(this.storageListener);
      this.storageListener = null;
    }
  }
}
