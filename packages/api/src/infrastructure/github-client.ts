import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
import { convertPKCS1ToPKCS8 } from './pkcs-converter';

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
  private readonly convertedPrivateKey: string;
  constructor(
    private appId: string,
    privateKey: string
  ) {
    // GitHub App が生成する PKCS#1 形式を PKCS#8 形式に変換
    // Cloudflare Workers の universal-github-app-jwt は PKCS#8 のみサポート
    this.convertedPrivateKey = convertPKCS1ToPKCS8(privateKey);
  }

  private async getInstallationToken(installationId: string): Promise<string> {
    const auth = createAppAuth({
      appId: this.appId,
      privateKey: this.convertedPrivateKey,
    });

    const { token } = await auth({
      type: 'installation',
      installationId: Number(installationId),
    });

    return token;
  }

  private async getAppOctokit(): Promise<Octokit> {
    const auth = createAppAuth({
      appId: this.appId,
      privateKey: this.convertedPrivateKey,
    });
    const appAuthentication = await auth({ type: 'app' });
    return new Octokit({ auth: appAuthentication.token });
  }

  async getInstallationIdForRepo(owner: string, repo: string): Promise<string> {
    const octokit = await this.getAppOctokit();
    const { data } = await octokit.apps.getRepoInstallation({ owner, repo });
    return data.id.toString();
  }

  async fetchFile(
    installationId: string,
    owner: string,
    repo: string,
    path: string,
    ref: string = 'main'
  ): Promise<GitHubFile> {
    console.info(`[GitHubClient] fetchFile: installationId=${installationId}, owner=${owner}, repo=${repo}, path=${path}, ref=${ref}`);
    const token = await this.getInstallationToken(installationId);
    const octokit = new Octokit({ auth: token });

    try {
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
    } catch (error) {
      console.error(`[GitHubClient] fetchFile error:`, error);
      throw error;
    }
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
      if (data.content && (!data.encoding || data.encoding === 'base64')) {
        const buffer = Buffer.from(data.content, 'base64');
        // Create a proper view of the buffer data and slice it to get a new ArrayBuffer
        // This ensures we get a clean copy without any offset issues
        const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        return uint8.slice().buffer;
      }

      if (data.download_url) {
        const response = await fetch(data.download_url, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/octet-stream',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to download image from GitHub: ${response.status}`);
        }

        return await response.arrayBuffer();
      }

      throw new Error('File content is not available from GitHub API response');
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

    // タイミングセーフな比較を使用
    return this.timingSafeEqual(signature, expectedSignature);
  }

  /**
   * タイミング攻撃を防ぐための定時間比較
   * 2つの文字列の長さや内容に関係なく、常に同じ時間で比較を行う
   */
  private timingSafeEqual(a: string, b: string): boolean {
    const encoder = new TextEncoder();
    const aBytes = encoder.encode(a);
    const bBytes = encoder.encode(b);

    // 長さが異なる場合でも全バイトを比較する（タイミング攻撃対策）
    const maxLength = Math.max(aBytes.length, bBytes.length);
    let result = aBytes.length === bBytes.length ? 0 : 1;

    for (let i = 0; i < maxLength; i++) {
      const aByte = i < aBytes.length ? aBytes[i] : 0;
      const bByte = i < bBytes.length ? bBytes[i] : 0;
      result |= aByte ^ bByte;
    }

    return result === 0;
  }
}
