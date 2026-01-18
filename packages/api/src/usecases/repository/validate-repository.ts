import { GitHubClient, type InstallationRepository } from '../../infrastructure/github-client';
import { RepositoryRepository } from '../../infrastructure/repositories/repository-repository';

export interface ValidateRepositoryInput {
  userId: string;
  installationId: string;
  githubRepoFullName: string;
}

export interface ValidateRepositoryOutput {
  isValid: boolean;
  repository: InstallationRepository | null;
  errors: string[];
  warnings: string[];
}

export class ValidateRepositoryUsecase {
  constructor(
    private githubClient: GitHubClient,
    private repoRepo: RepositoryRepository
  ) {}

  async execute(input: ValidateRepositoryInput): Promise<ValidateRepositoryOutput> {
    console.info(`[ValidateRepository] Validating repository: ${input.githubRepoFullName}`);

    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Check if the repository is accessible via the installation
    const repositories = await this.githubClient.listInstallationRepositories(
      input.installationId
    );

    const repo = repositories.find((r) => r.fullName === input.githubRepoFullName);
    if (!repo) {
      errors.push('指定されたリポジトリにはアクセス権限がありません');
      return { isValid: false, repository: null, errors, warnings };
    }

    // 2. Check if another user has already linked this repository
    const existingLink = await this.repoRepo.findByGitHubRepoFullName(
      input.githubRepoFullName
    );
    if (existingLink && existingLink.user_id !== input.userId) {
      errors.push('このリポジトリは既に他のユーザーに連携されています');
    }

    // 3. Add warnings for private repositories
    if (repo.isPrivate) {
      warnings.push('プライベートリポジトリです。記事のコンテンツは公開されます。');
    }

    console.info(
      `[ValidateRepository] Validation complete. Valid: ${errors.length === 0}, Errors: ${errors.length}, Warnings: ${warnings.length}`
    );

    return {
      isValid: errors.length === 0,
      repository: repo,
      errors,
      warnings,
    };
  }
}
