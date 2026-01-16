const MAX_IMAGE_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export class R2Client {
  constructor(private r2: R2Bucket) {}

  async putImage(
    userId: string,
    slug: string,
    filename: string,
    data: ArrayBuffer,
    contentType: string
  ): Promise<void> {
    // Validate content type
    if (!ALLOWED_CONTENT_TYPES.some((type) => contentType.startsWith(type))) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

    // Validate size
    if (data.byteLength > MAX_IMAGE_SIZE) {
      throw new Error(
        `Image size ${data.byteLength} bytes exceeds maximum ${MAX_IMAGE_SIZE} bytes`
      );
    }

    const key = `images/${userId}/${slug}/${filename}`;
    await this.r2.put(key, data, {
      httpMetadata: {
        contentType,
      },
    });
  }

  async getImage(userId: string, slug: string, filename: string): Promise<R2ObjectBody | null> {
    const key = `images/${userId}/${slug}/${filename}`;
    return await this.r2.get(key);
  }

  async deleteImages(userId: string, slug: string): Promise<void> {
    const prefix = `images/${userId}/${slug}/`;
    const list = await this.r2.list({ prefix });

    for (const object of list.objects) {
      await this.r2.delete(object.key);
    }
  }
}
