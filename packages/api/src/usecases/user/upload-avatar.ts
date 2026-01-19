import { UserRepository } from '../../infrastructure/repositories/user-repository';
import { R2Client } from '../../infrastructure/storage/r2-client';
import {
  UserNotFoundError,
  InvalidAvatarTypeError,
  AvatarSizeLimitExceededError,
} from '../../domain/errors/domain-errors';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export interface UploadAvatarInput {
  userId: string;
  file: File;
  imageUrl: string;
}

export interface UploadAvatarOutput {
  avatarUrl: string;
}

export class UploadAvatarUsecase {
  constructor(
    private userRepo: UserRepository,
    private r2Client: R2Client
  ) {}

  async execute(input: UploadAvatarInput): Promise<UploadAvatarOutput> {
    console.info(`[UploadAvatar] Starting for user: ${input.userId}`);

    // Validate user exists
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    // Validate content type
    const contentType = input.file.type;
    if (!ALLOWED_AVATAR_TYPES.includes(contentType)) {
      throw new InvalidAvatarTypeError(contentType);
    }

    // Validate size
    if (input.file.size > MAX_AVATAR_SIZE) {
      throw new AvatarSizeLimitExceededError(input.file.size, MAX_AVATAR_SIZE);
    }

    // Generate filename with timestamp to bust cache
    const ext = contentType.split('/')[1];
    const filename = `avatar-${Date.now()}.${ext}`;

    // Upload to R2
    const arrayBuffer = await input.file.arrayBuffer();
    await this.r2Client.putAvatar(input.userId, filename, arrayBuffer, contentType);

    // Construct URL
    const avatarUrl = `${input.imageUrl}/avatars/${input.userId}/${filename}`;

    // Update user icon_url
    user.updateProfile({ iconUrl: avatarUrl });
    await this.userRepo.save(user);

    console.info(`[UploadAvatar] Completed for user: ${input.userId}`);

    return { avatarUrl };
  }
}
