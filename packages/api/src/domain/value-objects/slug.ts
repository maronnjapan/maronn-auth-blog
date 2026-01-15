import { slugSchema } from '@maronn-auth-blog/shared';
import { ValidationError } from '@maronn-auth-blog/shared';

export class Slug {
  private constructor(private readonly value: string) {}

  static create(value: string): Slug {
    const result = slugSchema.safeParse(value);
    if (!result.success) {
      throw new ValidationError(`Invalid slug: ${result.error.message}`);
    }
    return new Slug(result.data);
  }

  static fromFilename(filename: string): Slug {
    // Remove .md extension
    const slug = filename.replace(/\.md$/, '');
    return Slug.create(slug);
  }

  toString(): string {
    return this.value;
  }

  equals(other: Slug): boolean {
    return this.value === other.value;
  }
}
