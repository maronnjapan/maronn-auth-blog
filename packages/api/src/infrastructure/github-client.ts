import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

export interface GitHubFile {
  content: string;
  sha: string;
}

export interface InstallationRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  htmlUrl: string;
  pushedAt: string | null;
}

export class GitHubClient {
  constructor(
    private appId: string,
    private privateKey: string
  ) {}

  private async getInstallationToken(installationId: string): Promise<string> {
    const auth = createAppAuth({
      appId: this.appId,
      privateKey: this.privateKey,
    });

    const { token } = await auth({
      type: 'installation',
      installationId,
    });

    return token;
  }

  async fetchFile(
    installationId: string,
    owner: string,
    repo: string,
    path: string,
    ref: string = 'main'
  ): Promise<GitHubFile> {
    const token = await this.getInstallationToken(installationId);
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ('content' in data && data.type === 'file') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      return {
        content,
        sha: data.sha,
      };
    }

    throw new Error('Not a file');
  }

  async fetchImage(
    installationId: string,
    owner: string,
    repo: string,
    path: string,
    ref: string = 'main'
  ): Promise<ArrayBuffer> {
    const token = await this.getInstallationToken(installationId);
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if ('content' in data && data.type === 'file') {
      const buffer = Buffer.from(data.content, 'base64');
      return buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      );
    }

    throw new Error('Not a file');
  }

  async listFiles(
    installationId: string,
    owner: string,
    repo: string,
    path: string = '',
    ref: string = 'main'
  ): Promise<Array<{ name: string; path: string; type: string; sha: string }>> {
    const token = await this.getInstallationToken(installationId);
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref,
    });

    if (Array.isArray(data)) {
      return data.map((item) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        sha: item.sha,
      }));
    }

    throw new Error('Not a directory');
  }

  async listInstallationRepositories(
    installationId: string
  ): Promise<InstallationRepository[]> {
    const token = await this.getInstallationToken(installationId);
    const octokit = new Octokit({ auth: token });

    const { data } = await octokit.apps.listReposAccessibleToInstallation({
      per_page: 100,
    });

    return (data.repositories ?? []).map((repo) => ({
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner?.login ?? '',
      description: repo.description ?? null,
      isPrivate: repo.private,
      defaultBranch: repo.default_branch,
      htmlUrl: repo.html_url,
      pushedAt: repo.pushed_at ?? null,
    }));
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );

    const expectedSignature = `sha256=${Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')}`;

    return signature === expectedSignature;
  }
}
