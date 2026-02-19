import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProcessGitHubPushUsecase, type GitHubPushEvent } from './process-github-push';
import type { ArticleRepository } from '../../infrastructure/repositories/article-repository';
import type { UserRepository } from '../../infrastructure/repositories/user-repository';
import type { RepositoryRepository } from '../../infrastructure/repositories/repository-repository';
import type { NotificationRepository } from '../../infrastructure/repositories/notification-repository';
import type { GitHubClient } from '../../infrastructure/github-client';
import type { KVClient } from '../../infrastructure/storage/kv-client';
import type { R2Client } from '../../infrastructure/storage/r2-client';
import type { ResendClient } from '../../infrastructure/resend-client';
import { User, type UserProps } from '../../domain/entities/user';
import { Article } from '../../domain/entities/article';
import { ArticleStatus } from '../../domain/value-objects/article-status';
import { Slug } from '../../domain/value-objects/slug';

const baseUserProps: UserProps = {
  id: 'user-1',
  username: 'test-user',
  displayName: 'Test User',
  githubUserId: '123',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const IMAGE_URL = 'https://images.example.com';
const ADMIN_EMAIL = 'admin@example.com';
const WEB_URL = 'https://example.com';

function createUsecase(options: {
  userInstallationId?: string;
  eventInstallationId?: number;
  markdown?: string;
}) {
  const user = new User({
    ...baseUserProps,
    githubInstallationId: options.userInstallationId,
  });

  const articleRepo = {
    findByGitHubPath: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
    saveTopics: vi.fn().mockResolvedValue(undefined),
    removeFtsIndex: vi.fn().mockResolvedValue(undefined),
  } as unknown as ArticleRepository;

  const userRepo = {
    findById: vi.fn().mockResolvedValue(user),
  } as unknown as UserRepository;

  const repoRepo = {
    findByGitHubRepoFullName: vi.fn().mockResolvedValue({
      id: 'repo-1',
      user_id: user.id,
      github_repo_full_name: 'foo/bar',
      created_at: new Date().toISOString(),
    }),
  } as unknown as RepositoryRepository;

  const notificationRepo = {
    save: vi.fn().mockResolvedValue(undefined),
  } as unknown as NotificationRepository;

  const markdown =
    options.markdown ?? ['---', 'title: Test Article', 'published: true', 'targetCategories: [authentication]', 'topics: []', '---', 'Content', ''].join('\n');

  const githubClient = {
    fetchFile: vi.fn().mockResolvedValue({
      content: markdown,
      sha: 'abc123',
    }),
    fetchImage: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
  } as unknown as GitHubClient;

  const kvClientMock = {
    setArticleMarkdown: vi.fn().mockResolvedValue(undefined),
    deleteArticleMarkdown: vi.fn().mockResolvedValue(undefined),
  };
  const kvClient = kvClientMock as unknown as KVClient;

  const r2ClientMock = {
    putImage: vi.fn().mockResolvedValue(undefined),
    deleteImages: vi.fn().mockResolvedValue(undefined),
  };
  const r2Client = r2ClientMock as unknown as R2Client;

  const resendClientMock = {
    sendEmail: vi.fn().mockResolvedValue(undefined),
  };
  const resendClient = resendClientMock as unknown as ResendClient;

  const usecase = new ProcessGitHubPushUsecase(
    articleRepo,
    userRepo,
    repoRepo,
    notificationRepo,
    githubClient,
    kvClient,
    r2Client,
    IMAGE_URL,
    resendClient,
    ADMIN_EMAIL,
    WEB_URL
  );

  const event: GitHubPushEvent = {
    ref: 'refs/heads/main',
    repository: {
      full_name: 'foo/bar',
    },
    commits: [
      {
        added: ['articles/test.md'],
        modified: [],
        removed: [],
      },
    ],
    installation: options.eventInstallationId
      ? { id: options.eventInstallationId }
      : undefined,
  };

  return { usecase, githubClient, kvClientMock, r2ClientMock, resendClientMock, event };
}

describe('ProcessGitHubPushUsecase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses installation id from the webhook event when user record lacks installation id', async () => {
    const { usecase, githubClient, event } = createUsecase({
      userInstallationId: undefined,
      eventInstallationId: 12345,
    });

    await usecase.execute(event);

    expect(githubClient.fetchFile).toHaveBeenCalledWith(
      '12345',
      'foo',
      'bar',
      'articles/test.md'
    );
  });

  it('falls back to user installation id when webhook event omits installation data', async () => {
    const { usecase, githubClient, event } = createUsecase({
      userInstallationId: '67890',
      eventInstallationId: undefined,
    });

    await usecase.execute(event);

    expect(githubClient.fetchFile).toHaveBeenCalledWith(
      '67890',
      'foo',
      'bar',
      'articles/test.md'
    );
  });

  it('skips processing when neither webhook event nor user record has installation id', async () => {
    const { usecase, githubClient, event } = createUsecase({
      userInstallationId: undefined,
      eventInstallationId: undefined,
    });

    await usecase.execute(event);

    expect(githubClient.fetchFile).not.toHaveBeenCalled();
  });

  it('stores the latest markdown content in KV for downstream processing', async () => {
    const { usecase, kvClientMock, event } = createUsecase({
      userInstallationId: '67890',
      eventInstallationId: undefined,
    });

    await usecase.execute(event);

    expect(kvClientMock.setArticleMarkdown).toHaveBeenCalledWith(
      'user-1',
      'test',
      expect.stringContaining('title: Test Article')
    );
  });

  it('uploads referenced images to R2 and rewrites markdown URLs', async () => {
    const markdownWithImage = [
      '---',
      'title: Test Article',
      'published: true',
      'targetCategories: [authentication]',
      'topics: []',
      '---',
      '![alt](./images/sample.png)',
      '',
    ].join('\n');

    const { usecase, githubClient, kvClientMock, r2ClientMock, event } = createUsecase({
      userInstallationId: '67890',
      eventInstallationId: undefined,
      markdown: markdownWithImage,
    });

    await usecase.execute(event);

    expect(githubClient.fetchImage).toHaveBeenCalledWith(
      '67890',
      'foo',
      'bar',
      'images/sample.png'
    );
    expect(r2ClientMock.putImage).toHaveBeenCalledWith(
      'user-1',
      'test',
      'sample.png',
      expect.any(ArrayBuffer),
      'image/png'
    );
    expect(kvClientMock.setArticleMarkdown).toHaveBeenCalledWith(
      'user-1',
      'test',
      expect.stringContaining(`${IMAGE_URL}/images/user-1/test/sample.png`)
    );
  });

  it('supports rooted image paths when uploading and rewriting markdown', async () => {
    const markdownWithImage = [
      '---',
      'title: Test Article',
      'published: true',
      'targetCategories: [authentication]',
      'topics: []',
      '---',
      '![alt](/images/sample.png)',
      '',
    ].join('\n');

    const { usecase, githubClient, kvClientMock, r2ClientMock, event } = createUsecase({
      userInstallationId: '67890',
      eventInstallationId: undefined,
      markdown: markdownWithImage,
    });

    await usecase.execute(event);

    expect(githubClient.fetchImage).toHaveBeenCalledWith(
      '67890',
      'foo',
      'bar',
      'images/sample.png'
    );
    expect(r2ClientMock.putImage).toHaveBeenCalledWith(
      'user-1',
      'test',
      'sample.png',
      expect.any(ArrayBuffer),
      'image/png'
    );
    expect(kvClientMock.setArticleMarkdown).toHaveBeenCalledWith(
      'user-1',
      'test',
      expect.stringContaining(`${IMAGE_URL}/images/user-1/test/sample.png`)
    );
  });

  it('uploads images in subdirectories without duplicating the path', async () => {
    const markdownWithImage = [
      '---',
      'title: Test Article',
      'published: true',
      'targetCategories: [authentication]',
      'topics: []',
      '---',
      '![alt](./images/tests/test.png)',
      '',
    ].join('\n');

    const { usecase, githubClient, kvClientMock, r2ClientMock, event } = createUsecase({
      userInstallationId: '67890',
      eventInstallationId: undefined,
      markdown: markdownWithImage,
    });

    await usecase.execute(event);

    expect(githubClient.fetchImage).toHaveBeenCalledWith(
      '67890',
      'foo',
      'bar',
      'images/tests/test.png'
    );
    expect(r2ClientMock.putImage).toHaveBeenCalledWith(
      'user-1',
      'test',
      'test.png',
      expect.any(ArrayBuffer),
      'image/png'
    );
    expect(kvClientMock.setArticleMarkdown).toHaveBeenCalledWith(
      'user-1',
      'test',
      expect.stringContaining(`${IMAGE_URL}/images/user-1/test/test.png`)
    );
  });

  it('sends admin email when a new article is created', async () => {
    const { usecase, resendClientMock, event } = createUsecase({
      userInstallationId: '67890',
      eventInstallationId: undefined,
    });

    await usecase.execute(event);

    expect(resendClientMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ADMIN_EMAIL,
        subject: expect.stringContaining('Test Article'),
      })
    );
  });

  it('sends admin email when an existing article is marked for re-review', async () => {
    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const article = new Article({
      id: 'article-1',
      userId: user.id,
      slug: Slug.create('test'),
      title: 'Published Article',
      category: undefined,
      status: ArticleStatus.published(),
      githubPath: 'articles/test.md',
      githubSha: 'old-sha',
      publishedSha: 'old-sha',
      rejectionReason: undefined,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      targetCategories: ['authentication'],
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(article),
      save: vi.fn().mockResolvedValue(undefined),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockResolvedValue({
        content: ['---', 'title: Test Article', 'published: true', 'targetCategories: [authentication]', 'topics: []', '---', 'Content'].join('\n'),
        sha: 'new-sha',
      }),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClient = {
      setArticleMarkdown: vi.fn().mockResolvedValue(undefined),
      deleteArticleMarkdown: vi.fn(),
    } as unknown as KVClient;

    const r2Client = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    } as unknown as R2Client;

    const resendClientMock = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    };
    const resendClient = resendClientMock as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo,
      userRepo,
      repoRepo,
      notificationRepo,
      githubClient,
      kvClient,
      r2Client,
      IMAGE_URL,
      resendClient,
      ADMIN_EMAIL,
      WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: {
        full_name: 'foo/bar',
      },
      commits: [
        {
          added: [],
          modified: ['articles/test.md'],
          removed: [],
        },
      ],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(resendClientMock.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ADMIN_EMAIL,
        subject: expect.stringContaining('再審査'),
      })
    );
  });

  it('does not overwrite cached markdown for already published articles', async () => {
    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const article = new Article({
      id: 'article-1',
      userId: user.id,
      slug: Slug.create('test'),
      title: 'Published Article',
      category: undefined,
      status: ArticleStatus.published(),
      githubPath: 'articles/test.md',
      githubSha: 'old-sha',
      publishedSha: 'old-sha',
      rejectionReason: undefined,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      targetCategories: ['authentication'],
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(article),
      save: vi.fn().mockResolvedValue(undefined),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockResolvedValue({
        content: ['---', 'title: Test Article', 'published: true', 'targetCategories: [authentication]', 'topics: []', '---', 'Content'].join('\n'),
        sha: 'new-sha',
      }),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClientMock = {
      setArticleMarkdown: vi.fn().mockResolvedValue(undefined),
      deleteArticleMarkdown: vi.fn(),
    };
    const kvClient = kvClientMock as unknown as KVClient;

    const r2ClientMock = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    };
    const r2Client = r2ClientMock as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo,
      userRepo,
      repoRepo,
      notificationRepo,
      githubClient,
      kvClient,
      r2Client,
      IMAGE_URL,
      resendClient,
      ADMIN_EMAIL,
      WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: {
        full_name: 'foo/bar',
      },
      commits: [
        {
          added: [],
          modified: ['articles/test.md'],
          removed: [],
        },
      ],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(kvClientMock.setArticleMarkdown).not.toHaveBeenCalled();
    expect(r2ClientMock.putImage).not.toHaveBeenCalled();
  });

  it('updates targetCategories, title, and category when a published article is modified', async () => {
    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const article = new Article({
      id: 'article-1',
      userId: user.id,
      slug: Slug.create('test'),
      title: 'Old Title',
      category: '認証',
      status: ArticleStatus.published(),
      githubPath: 'articles/test.md',
      githubSha: 'old-sha',
      publishedSha: 'old-sha',
      rejectionReason: undefined,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      targetCategories: ['authentication'],
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(article),
      save: vi.fn().mockResolvedValue(undefined),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockResolvedValue({
        content: ['---', 'title: New Title', 'published: true', 'category: セキュリティ', 'targetCategories: [security, authorization]', 'topics: [oauth]', '---', 'Content'].join('\n'),
        sha: 'new-sha',
      }),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClient = {
      setArticleMarkdown: vi.fn().mockResolvedValue(undefined),
      deleteArticleMarkdown: vi.fn(),
    } as unknown as KVClient;

    const r2Client = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    } as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo,
      userRepo,
      repoRepo,
      notificationRepo,
      githubClient,
      kvClient,
      r2Client,
      IMAGE_URL,
      resendClient,
      ADMIN_EMAIL,
      WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: {
        full_name: 'foo/bar',
      },
      commits: [
        {
          added: [],
          modified: ['articles/test.md'],
          removed: [],
        },
      ],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(article.status.toString()).toBe('pending_update');
    expect(article.githubSha).toBe('new-sha');
    expect(article.title).toBe('New Title');
    expect(article.category).toBe('セキュリティ');
    expect(article.targetCategories).toEqual(['security', 'authorization']);
    expect(articleRepo.save).toHaveBeenCalledWith(article);
  });

  it('updates metadata for a pending_new article when content changes', async () => {
    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const article = new Article({
      id: 'article-1',
      userId: user.id,
      slug: Slug.create('test'),
      title: 'Old Title',
      category: undefined,
      status: ArticleStatus.pendingNew(),
      githubPath: 'articles/test.md',
      githubSha: 'old-sha',
      publishedSha: undefined,
      rejectionReason: undefined,
      publishedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      targetCategories: ['authentication'],
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(article),
      save: vi.fn().mockResolvedValue(undefined),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockResolvedValue({
        content: ['---', 'title: Updated Title', 'published: true', 'targetCategories: [security]', 'topics: []', '---', 'New Content'].join('\n'),
        sha: 'new-sha',
      }),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClient = {
      setArticleMarkdown: vi.fn().mockResolvedValue(undefined),
      deleteArticleMarkdown: vi.fn(),
    } as unknown as KVClient;

    const r2Client = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    } as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo,
      userRepo,
      repoRepo,
      notificationRepo,
      githubClient,
      kvClient,
      r2Client,
      IMAGE_URL,
      resendClient,
      ADMIN_EMAIL,
      WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: {
        full_name: 'foo/bar',
      },
      commits: [
        {
          added: [],
          modified: ['articles/test.md'],
          removed: [],
        },
      ],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(article.status.toString()).toBe('pending_new');
    expect(article.githubSha).toBe('new-sha');
    expect(article.title).toBe('Updated Title');
    expect(article.targetCategories).toEqual(['security']);
    expect(articleRepo.save).toHaveBeenCalledWith(article);
    expect(articleRepo.saveTopics).toHaveBeenCalledWith('article-1', []);
  });

  it('marks a rejected article for re-review when updated', async () => {
    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const article = new Article({
      id: 'article-1',
      userId: user.id,
      slug: Slug.create('test'),
      title: 'Rejected Article',
      category: undefined,
      status: ArticleStatus.rejected(),
      githubPath: 'articles/test.md',
      githubSha: 'old-sha',
      publishedSha: undefined,
      rejectionReason: 'Needs fixes',
      publishedAt: undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      targetCategories: ['authentication']
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(article),
      save: vi.fn().mockResolvedValue(undefined),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockResolvedValue({
        content: ['---', 'title: Test Article', 'published: true', 'targetCategories: [authentication]', 'topics: []', '---', 'Content'].join('\n'),
        sha: 'new-sha',
      }),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClient = {
      setArticleMarkdown: vi.fn().mockResolvedValue(undefined),
      deleteArticleMarkdown: vi.fn(),
    } as unknown as KVClient;

    const r2Client = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    } as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo,
      userRepo,
      repoRepo,
      notificationRepo,
      githubClient,
      kvClient,
      r2Client,
      IMAGE_URL,
      resendClient,
      ADMIN_EMAIL,
      WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: {
        full_name: 'foo/bar',
      },
      commits: [
        {
          added: [],
          modified: ['articles/test.md'],
          removed: [],
        },
      ],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(article.status.toString()).toBe('pending_update');
    expect(article.githubSha).toBe('new-sha');
    expect(article.rejectionReason).toBeUndefined();
    expect(articleRepo.save).toHaveBeenCalledWith(article);
  });

  it('creates error notification when GitHub file fetch fails', async () => {
    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockRejectedValue(new Error('GitHub API rate limit exceeded')),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClient = {
      setArticleMarkdown: vi.fn(),
      deleteArticleMarkdown: vi.fn(),
    } as unknown as KVClient;

    const r2Client = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    } as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo,
      userRepo,
      repoRepo,
      notificationRepo,
      githubClient,
      kvClient,
      r2Client,
      IMAGE_URL,
      resendClient,
      ADMIN_EMAIL,
      WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: { full_name: 'foo/bar' },
      commits: [{ added: ['articles/test.md'], modified: [], removed: [] }],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(notificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          userId: 'user-1',
          message: expect.stringContaining('GitHub API rate limit exceeded'),
        }),
      })
    );
  });

  it('creates error notification when frontmatter is invalid', async () => {
    const markdown = 'no frontmatter here, just plain text';
    const { usecase, event } = createUsecase({
      userInstallationId: '67890',
      markdown,
    });

    // Override fetchFile to return invalid frontmatter
    const githubClient = (usecase as unknown as { githubClient: GitHubClient }).githubClient;
    (githubClient.fetchFile as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: markdown,
      sha: 'abc123',
    });

    await usecase.execute(event);
  });

  it('creates error notification when title is missing', async () => {
    const markdownNoTitle = ['---', 'published: true', 'targetCategories: [authentication]', 'topics: []', '---', 'Content'].join('\n');

    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockResolvedValue({ content: markdownNoTitle, sha: 'abc123' }),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClient = {
      setArticleMarkdown: vi.fn(),
      deleteArticleMarkdown: vi.fn(),
    } as unknown as KVClient;

    const r2Client = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    } as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo, userRepo, repoRepo, notificationRepo,
      githubClient, kvClient, r2Client, IMAGE_URL,
      resendClient, ADMIN_EMAIL, WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: { full_name: 'foo/bar' },
      commits: [{ added: ['articles/test.md'], modified: [], removed: [] }],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(notificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          userId: 'user-1',
          message: expect.stringContaining('title'),
        }),
      })
    );
  });

  it('creates error notification when targetCategories is missing', async () => {
    const markdownNoCategories = ['---', 'title: Test', 'published: true', 'topics: []', '---', 'Content'].join('\n');

    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockResolvedValue({ content: markdownNoCategories, sha: 'abc123' }),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClient = {
      setArticleMarkdown: vi.fn(),
      deleteArticleMarkdown: vi.fn(),
    } as unknown as KVClient;

    const r2Client = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    } as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo, userRepo, repoRepo, notificationRepo,
      githubClient, kvClient, r2Client, IMAGE_URL,
      resendClient, ADMIN_EMAIL, WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: { full_name: 'foo/bar' },
      commits: [{ added: ['articles/test.md'], modified: [], removed: [] }],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(notificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          userId: 'user-1',
          message: expect.stringContaining('targetCategories'),
        }),
      })
    );
  });

  it('creates error notification when image processing fails', async () => {
    const markdownWithImage = [
      '---',
      'title: Test Article',
      'published: true',
      'targetCategories: [authentication]',
      'topics: []',
      '---',
      '![alt](./images/sample.png)',
      '',
    ].join('\n');

    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockResolvedValue(undefined),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockResolvedValue({ content: markdownWithImage, sha: 'abc123' }),
      fetchImage: vi.fn().mockRejectedValue(new Error('Not Found')),
    } as unknown as GitHubClient;

    const kvClient = {
      setArticleMarkdown: vi.fn(),
      deleteArticleMarkdown: vi.fn(),
    } as unknown as KVClient;

    const r2Client = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    } as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo, userRepo, repoRepo, notificationRepo,
      githubClient, kvClient, r2Client, IMAGE_URL,
      resendClient, ADMIN_EMAIL, WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: { full_name: 'foo/bar' },
      commits: [{ added: ['articles/test.md'], modified: [], removed: [] }],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(notificationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        props: expect.objectContaining({
          userId: 'user-1',
          message: expect.stringContaining('Not Found'),
        }),
      })
    );
  });

  it('does not throw when error notification creation itself fails', async () => {
    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(null),
      save: vi.fn(),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn(),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn().mockRejectedValue(new Error('DB connection error')),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn().mockRejectedValue(new Error('GitHub API error')),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClient = {
      setArticleMarkdown: vi.fn(),
      deleteArticleMarkdown: vi.fn(),
    } as unknown as KVClient;

    const r2Client = {
      putImage: vi.fn(),
      deleteImages: vi.fn(),
    } as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo, userRepo, repoRepo, notificationRepo,
      githubClient, kvClient, r2Client, IMAGE_URL,
      resendClient, ADMIN_EMAIL, WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: { full_name: 'foo/bar' },
      commits: [{ added: ['articles/test.md'], modified: [], removed: [] }],
      installation: { id: 123 },
    };

    // Should not throw even when both the file processing and notification creation fail
    await expect(usecase.execute(event)).resolves.toBeUndefined();
  });

  it('removes cached markdown when the source file is deleted', async () => {
    const user = new User({
      ...baseUserProps,
      githubInstallationId: '67890',
    });

    const article = new Article({
      id: 'article-1',
      userId: user.id,
      slug: Slug.create('test'),
      title: 'Existing Article',
      category: undefined,
      status: ArticleStatus.published(),
      githubPath: 'articles/test.md',
      githubSha: 'abc',
      publishedSha: 'abc',
      rejectionReason: undefined,
      publishedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      targetCategories: ['authentication']
    });

    const articleRepo = {
      findByGitHubPath: vi.fn().mockResolvedValue(article),
      findById: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      saveTopics: vi.fn(),
      removeFtsIndex: vi.fn().mockResolvedValue(undefined),
    } as unknown as ArticleRepository;

    const userRepo = {
      findById: vi.fn().mockResolvedValue(user),
    } as unknown as UserRepository;

    const repoRepo = {
      findByGitHubRepoFullName: vi.fn().mockResolvedValue({
        id: 'repo-1',
        user_id: user.id,
        github_repo_full_name: 'foo/bar',
        created_at: new Date().toISOString(),
      }),
    } as unknown as RepositoryRepository;

    const notificationRepo = {
      save: vi.fn(),
    } as unknown as NotificationRepository;

    const githubClient = {
      fetchFile: vi.fn(),
      fetchImage: vi.fn(),
    } as unknown as GitHubClient;

    const kvClientMock = {
      setArticleMarkdown: vi.fn().mockResolvedValue(undefined),
      deleteArticleMarkdown: vi.fn().mockResolvedValue(undefined),
    };
    const kvClient = kvClientMock as unknown as KVClient;

    const r2ClientMock = {
      putImage: vi.fn(),
      deleteImages: vi.fn().mockResolvedValue(undefined),
    };
    const r2Client = r2ClientMock as unknown as R2Client;

    const resendClient = {
      sendEmail: vi.fn().mockResolvedValue(undefined),
    } as unknown as ResendClient;

    const usecase = new ProcessGitHubPushUsecase(
      articleRepo,
      userRepo,
      repoRepo,
      notificationRepo,
      githubClient,
      kvClient,
      r2Client,
      IMAGE_URL,
      resendClient,
      ADMIN_EMAIL,
      WEB_URL
    );

    const event: GitHubPushEvent = {
      ref: 'refs/heads/main',
      repository: {
        full_name: 'foo/bar',
      },
      commits: [
        {
          added: [],
          modified: [],
          removed: ['articles/test.md'],
        },
      ],
      installation: { id: 123 },
    };

    await usecase.execute(event);

    expect(kvClientMock.deleteArticleMarkdown).toHaveBeenCalledWith('user-1', 'test');
    expect(r2ClientMock.deleteImages).toHaveBeenCalledWith('user-1', 'test');
  });
});
