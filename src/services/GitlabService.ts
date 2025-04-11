export const GITLAB_SIGNUP_URL = 'https://gitlab.com/users/sign_up';
export const CREATE_TOKEN_URL =
  'https://gitlab.com/-/user_settings/personal_access_tokens?scopes=api,read_api,read_repository,write_repository&description=Bolt%20Integration&default_expires_at=none';

import { BaseGitlabService, type ProgressCallback } from './BaseGitlabService';
import { gitlabTokenValidator } from './GitlabTokenValidator';
import { RateLimitHandler } from './RateLimitHandler';
import { Queue } from '../lib/Queue';



interface RepoCreateOptions {
  name: string;
  visibility?: string;
  description?: string;
}

interface RepoInfo {
  name: string;
  description?: string;
  private?: boolean;
  exists: boolean;
}

export class GitlabService extends  BaseGitlabService{
  private tokenValidator: gitlabTokenValidator;

  constructor(token: string) {
    super(token);
    this.tokenValidator = new gitlabTokenValidator(token);
  }

  async validateToken(): Promise<boolean> {
    return this.tokenValidator.validateToken();
  }

  async isClassicToken(): Promise<boolean> {
    return this.tokenValidator.isClassicToken();
  }



  async validateTokenAndUser(username: string): Promise<{ isValid: boolean; error?: string }> {
    return this.tokenValidator.validateTokenAndUser(username);
  }

  async verifyTokenPermissions(
    username: string,
    onProgress?: ProgressCallback
  ): Promise<{ isValid: boolean; error?: string }> {
    return this.tokenValidator.verifyTokenPermissions(username, onProgress);
  }

  async repoExists(owner: string, repo_id: string): Promise<boolean> {
    try {
      await this.request('GET', `/projects/${repo_id}`);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return false;
      }
      throw error;
    }
  }

  async getRepoInfo(repo_id: string, repo_name: string): Promise<RepoInfo> {
    try {
      const response: RepoInfo = await this.request('GET', `/projects/${repo_id}`);

      return {
        name: response.name,
        description: response.description,
        private: true,
        exists: true,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return { name: repo_name, exists: false };
      }
      throw error;
    }
  }


  async getProjectByBame(repoName: string) {
    try {
      const project = await this.request('GET', `/projects?membership=true&min_access_level=30&per_page=100&order_by=updated_at&search=${repoName}`);
      return project;
    } catch (error) {
      console.error('Failed to get project by name:', error);
      return null;
    }
  }

  async createRepo(options: RepoCreateOptions & { auto_init?: boolean }) {
    const { auto_init = true, ...repoOptions } = options;


      // Try creating in user's account first
      try {
        return await this.request('POST', '/projects', {
          ...repoOptions,
          auto_init, // Use the provided value or default to true
        });

      } catch (error) {
        console.error('Failed to create repository:', error);
        throw new Error(
          `Failed to create repository: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
  }


  async ensureRepoExists(owner: string, repo: string): Promise<void> {
    const exists = await this.repoExists(owner, repo);
  }

  async isRepoEmpty(owner: string, repo: string, projectId:string): Promise<boolean> {
    try {
      const commits = await this.request('GET', `/projects/${projectId}/repository/commits`);
      return commits.length === 0;
    } catch (error) {
      console.log('error', error);
      if (error instanceof Error && error.message.includes('409')) {
        // 409 is returned for empty repositories
        return true;
      }
      throw error;
    }
  }

  async initializeEmptyRepo(owner: string, repo: string,projectId:string, branch: string): Promise<void> {
    // Create a more informative README.md to initialize the repository
    const readmeContent = `# ${repo}

## Feel free to delete this file and replace it with your own content.

## Repository Initialization Notice

This repository was automatically initialized by the Bolt to Gitlab extension.

**Auto-Generated Repository**
- Created to ensure a valid Git repository structure
- Serves as an initial commit point for your project`;

    await this.pushFile({
      owner,
      repoId: projectId,
      path: 'README.md',
      content: btoa(readmeContent),
      branch,
      message: 'Initialize repository with auto-generated README',
    });
  }

async pushFile(params: {
  owner: string;
  repoId: string;
  path: string;
  content: string;
  branch: string;
  message: string;
  checkExisting?: boolean;
}) {
  const { repoId, path, content, branch, message, checkExisting = true } = params;

  let action = 'create';

  try {
    if (checkExisting) {
      try {
        // Check if the file exists
        const existing = await this.request(
          'GET',
          `/projects/${repoId}/repository/files/${encodeURIComponent(path)}?ref=${branch}`
        );

        if (existing) {
          action = 'update';
        }
      } catch (error) {
        // File not found, we'll create it
        console.log('File not found, will create:', path);
      }
    }

    // Commit the file change
    const commitBody = {
      branch,
      commit_message: message,
      actions: [
        {
          action,       // 'create' or 'update'
          file_path: path,
          content: content,
        },
      ],
    };

    const response = await this.request(
      'POST',
      `/projects/${repoId}/repository/commits`,
      commitBody
    );

    return response;
  } catch (error) {
    console.error('❌ GitLab push error:', error);
    throw new Error(
      `Failed to push file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}


  async getCommitCount(owner: string, repo: string, branch: string): Promise<number> {
    try {
      const commits = await this.request('GET', `/repos/${owner}/${repo}/commits`, null, {
        headers: {
          per_page: '1', // We only need the count from headers
        },
      });

      // Gitlab returns the total count in the Link header
      const linkHeader = commits.headers?.get('link');
      if (linkHeader) {
        const match = linkHeader.match(/page=(\d+)>; rel="last"/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }

      // If no pagination, count the commits manually
      return commits.length;
    } catch (error) {
      console.error('Failed to fetch commit count:', error);
      return 0;
    }
  }

  async createTemporaryPublicRepo(ownerName: string, sourceRepoName: string): Promise<string> {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const tempRepoName = `temp-${sourceRepoName}-${timestamp}-${randomStr}`;
    // Create repo without auto-init

    const response = await this.createRepo({
      name: tempRepoName,
      visibility: 'private' ,

      description: 'Temporary repository for Bolt import - will be deleted automatically',
    });
  // Check if response contains the necessary fields
  if (response && response.id) {
    console.log("Repository created successfully with ID:", response.id);

    // Proceed with pushing the empty commit to initialize the repo
    await this.pushFile({
      owner: ownerName,
      repoId: response.id, // Use the ID from the response
      path: '.gitkeep',
      content: btoa(''), // Empty file
      branch: 'main',
      message: 'Initialize repository',
      checkExisting: false,
    });
        return response ;
  } else {
    console.error("Repository creation failed or invalid response:", response);
    // Handle the error or return early if needed
  }

      return response ;
  }
  async cloneRepoContents(
  sourceProject: string,
  targetProject: string,
  branch: string = 'main',
  onProgress?: (progress: number) => void
): Promise<void> {
  const rateLimitHandler = new RateLimitHandler();
  const queue = new Queue(1); // Using a queue for serial execution

  try {
    // Check GitLab rate limits - GitLab provides headers with rate limit info
    // We'll rely on the handler to manage this instead of checking upfront

    // Get repository tree from GitLab
    // GitLab API reference: https://docs.gitlab.com/ee/api/repositories.html#list-repository-tree
    await rateLimitHandler.beforeRequest();
    const queryParams = new URLSearchParams({
      ref: branch,
      recursive: 'true',
      per_page: '100'
    }).toString();
    const url = `/projects/${encodeURIComponent(sourceProject)}/repository/tree?${queryParams}`;

    const response = await this.request(
      'GET',
      url
    );

    // For GitLab, we may need to handle pagination for large repositories
    let files = response.filter((item: any) => item.type === 'blob');

    // If response has pagination headers, we should fetch all pages
    const totalPages = parseInt(response.headers?.['x-total-pages'] || '1');
    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page++) {
        await rateLimitHandler.beforeRequest();

        const query = new URLSearchParams({
        ref: branch,
        recursive: 'true',
        per_page: '100',
        page: String(page)
      }).toString();

      const url = `/projects/${encodeURIComponent(sourceProject)}/repository/tree?${query}`;
      const pageResponse = await this.request('GET', url);

      files = [...files, ...pageResponse.filter((item: any) => item.type === 'blob')];
      }
    }

    const totalFiles = files.length;

    // Reset rate limit handler counter before starting batch
    rateLimitHandler.resetRequestCount();

    // Process files serially through queue
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      await queue.add(async () => {
        let success = false;
        while (!success) {
          try {
            // Get file content
            // GitLab API: https://docs.gitlab.com/ee/api/repository_files.html#get-file-from-repository
            await rateLimitHandler.beforeRequest();
            const filePath = encodeURIComponent(file.path);
            const query = new URLSearchParams({ ref: branch }).toString();
            const url = `/projects/${encodeURIComponent(sourceProject)}/repository/files/${filePath}?${query}`;

            const content = await this.request('GET', url);


            // Push file content to target project
            // GitLab API: https://docs.gitlab.com/ee/api/repository_files.html#create-new-file-in-repository
            await rateLimitHandler.beforeRequest();
            await this.request(
              'POST',
              `/projects/${encodeURIComponent(targetProject)}/repository/files/${encodeURIComponent(file.path)}`,
              {

                  branch,
                  content: content.content, // GitLab returns base64 encoded content
                  commit_message: `Copy ${file.path} from source project`,
                  encoding: 'base64' // Specify that the content is base64 encoded

              }
            );

            success = true;
            rateLimitHandler.resetRetryCount();

            // Reset request counter every 10 files to maintain burst behavior
            if ((i + 1) % 10 === 0) {
              rateLimitHandler.resetRequestCount();
            }

            if (onProgress) {
              const progress = ((i + 1) / totalFiles) * 100;
              onProgress(progress);
            }
          } catch (error) {
            console.error(`Failed to process file line 386 ${file.path}:`, error);
            // GitLab returns 429 for rate limit errors
            if (error instanceof Response && error.status === 429) {
              await rateLimitHandler.handleRateLimit(error);
            } else if (error instanceof Response && error.status === 404) {
              console.warn(`File ${file.path} not found, skipping`);
              success = true; // Skip this file and continue
            } else {
              throw error;
            }
          }
        }
      });
    }
  } catch (error) {
    console.error('Failed to clone repository contents from GitLab:', error);
    throw new Error(
      `Failed to clone repository contents from GitLab: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
  }

  async deleteRepo(projectId: string): Promise<void> {
    await this.request('DELETE', `/projects/${projectId}`);
  }

  async updateRepoVisibility(projectId: string, visibility: string): Promise<void> {
    await this.request('PUT', `/projects/${projectId}`, {
      visibility: visibility,
    });
  }

  async listRepos(): Promise<
    Array<{
      name: string;
      description: string | null;
      private: boolean;
      html_url: string;
      created_at: string;
      updated_at: string;
      language: string | null;
    }>
  > {
    try {
      const repos = await this.request('GET', `/projects?membership=true&min_access_level=30&per_page=100&order_by=updated_at&owned=true`);

      return repos.map((repo: any) => ({
        name: repo.name,
        description: repo.description,
        private: repo.visibility === 'private',
        html_url: repo.http_url_to_repo,
        created_at: repo.created_at,
        updated_at: repo.updated_at,
        language: "",
      }));
    } catch (error) {
      console.error('Failed to fetch repositories:', error);
      throw new Error(
        `Failed to fetch repositories: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
