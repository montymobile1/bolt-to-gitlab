import type { GitlabSettingsInterface, ProjectSettings } from '$lib/types';

export interface SettingsCheckResult {
  isSettingsValid: boolean;
  gitlabSettings?: GitlabSettingsInterface;
}

export class SettingsService {
  static async getGitlabSettings(): Promise<SettingsCheckResult> {
    try {
      const [settings, projectId] = await Promise.all([
        chrome.storage.sync.get(['gitlabToken', 'repoOwner', 'projectSettings']),
        chrome.storage.sync.get('projectId'),
      ]);
      let projectSettings = settings.projectSettings?.[projectId.projectId];


      if (!projectSettings && projectId?.projectId && settings.repoOwner && settings.gitlabToken) {

        projectSettings = { repoName: projectSettings.repoName, branch: 'main', projectId: projectId.projectId};

        await chrome.storage.sync.set({
          [`projectSettings.${projectSettings.repoName}`]: projectSettings,
        });
      }

      const isSettingsValid = Boolean(
        settings.gitlabToken && settings.repoOwner && settings.projectSettings && projectSettings
      );

      return {
        isSettingsValid,
        gitlabSettings: {
          gitlabToken: settings.gitlabToken,
          repoOwner: settings.repoOwner,
          projectSettings: projectSettings || undefined,
        },
      };
    } catch (error) {
      console.error('Error checking Gitlab settings:', error);
      return { isSettingsValid: false };
    }
  }

  static async getProjectId(): Promise<string | null> {
    try {
      const { projectId } = await chrome.storage.sync.get('projectId');
      return projectId || null;
    } catch (error) {
      console.error('Failed to get project ID:', error);
      return null;
    }
  }

  static async setProjectId(projectId: string): Promise<void> {
    try {
      await chrome.storage.sync.set({ projectId });
    } catch (error) {
      console.error('Failed to set project ID:', error);
    }
  }
}
