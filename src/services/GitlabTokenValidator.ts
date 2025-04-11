import { BaseGitlabService, type ProgressCallback } from './BaseGitlabService';

export class gitlabTokenValidator extends  BaseGitlabService {
  async validateToken(): Promise<boolean> {
    try {
      await this.request('GET', '/user');
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  isClassicToken(): boolean {
    return this.token.startsWith('ghp_');
  }


  private async validateClassicToken(
    username: string
  ): Promise<{ isValid: boolean; error?: string }> {
      try {
        // Fetch the authenticated user's information from GitLab
        const authUser = await this.request('GET', '/user');

        // Check if the user login exists in the response
        if (!authUser.username) {
          return { isValid: false, error: 'Invalid GitLab token' };
        }

        // If the authenticated user is the same as the provided username, the token is valid
        if (authUser.username.toLowerCase() === username.toLowerCase()) {

          return { isValid: true };
        }


        return {
          isValid: false,
          error: 'Token can only be used with your GitLab username or groups you have access to',
        };
      } catch (error) {
        // Handle 404 error for invalid user or group
        if (error instanceof Error && error.message.includes('404')) {
          return { isValid: false, error: 'Invalid GitLab username or group' };
        }
        return { isValid: false, error: 'Invalid GitLab token' };
      }
    }



  async validateTokenAndUser(username: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      return await this.validateClassicToken(username);
    } catch (error) {
      console.error('Validation failed:', error);
      return { isValid: false, error: 'Validation failed' };
    }
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async verifyTokenPermissions(
  username: string,
  onProgress?: ProgressCallback
  ): Promise<{
    isValid: boolean;
    permission?: string;
    error?: string;
    }> {
      try {
        const repoName = `test-repo-${Date.now()}`;

        // Step 1: Test repository creation
        const project = await this.createTestRepository(repoName);
        if (!project) {
          return {
            permission: 'repos',
            isValid: false,
            error: 'Token lacks repository creation permission',
          };
        }

        onProgress?.({ permission: 'repos', isValid: true });

        // Step 2: Check admin permission
        const isAdmin = await this.checkAdminPermissions(project, username, onProgress);
        if (!isAdmin) {
          await this.cleanupRepository(project.id);
          return {
                        permission: 'admin',
            isValid: false,

            error: 'Token lacks repository administration permission',
          };
        }
        onProgress?.({ permission: 'admin', isValid: true });

        // Step 3: Check code write permission
        const canWriteCode = await this.testCodeWritePermissions(project, onProgress);
        if (!canWriteCode) {
          await this.cleanupRepository(project.id);
          return {

            permission: 'code',
            isValid: false,
            error: 'Token lacks code write permission',
          };
        }
        onProgress?.({ permission: 'code', isValid: true });

        // Cleanup
        await this.cleanupRepository(project.id);

        return {

          permission: 'code', // the last successful permission checked
          isValid: true,
        };
      } catch (error) {
        console.error('Permission verification failed:', error);
        return {
          isValid: false,
          permission: undefined,
          error: `Permission verification failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        };
      }
    }



  private async createTestRepository(repoName: string) {
    try {
      const project = await this.request('POST', '/projects', { name: repoName, visibility: 'private' });
      await this.delay(2000); // Simulate delay for repo creation
      return project;
    } catch (error) {
      console.error('Failed to create repository line 147 :', error);
      return null;
    }
  }



  private async checkAdminPermissions(project: any, username: string, onProgress?: ProgressCallback) {
    try {
      const users = await this.request('GET', `/projects/${project.id}/users`);
      await this.delay(2000); // Simulate delay
      const user = users.find((u: any) => u.username === username);

      if (user) {
        onProgress?.({ permission: 'admin', isValid: true });
        return true;
      } else {
        onProgress?.({ permission: 'admin', isValid: false });
        return false;
      }
    } catch (error) {
      onProgress?.({ permission: 'admin', isValid: false });
      return false;
    }
  }

  private async testCodeWritePermissions(project: any, onProgress?: ProgressCallback) {
    try {
      const content = btoa("This is a .gitkeep file");
      await this.request('POST', `/projects/${project.id}/repository/files/.gitkeep`, {
        branch: 'main',
        content: content,
        commit_message: 'Add .gitkeep file',
      });

      // Test contents read by listing contents
      await this.request('GET', `/projects/${project.id}/repository/tree`);

      onProgress?.({ permission: 'code', isValid: true });
      return true;
    } catch (error) {
      console.error('Failed to test code write permissions:', error);
      onProgress?.({ permission: 'code', isValid: false });
      return false;
    }
  }

  private async cleanupRepository(projectId: number) {
    try {
      await this.request('DELETE', `/projects/${projectId}`);
      console.log("Repository cleaned up");
    } catch (cleanupError) {
      console.error('Failed to cleanup repository after permissions check:', cleanupError);
    }
  }
}
