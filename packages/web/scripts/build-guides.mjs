import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import markdownToHtmlImport from 'zenn-markdown-html';

const markdownToHtml = typeof markdownToHtmlImport === 'function'
  ? markdownToHtmlImport
  : markdownToHtmlImport.default;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const rootDir = join(__dirname, '..');
const guideContentDir = join(rootDir, 'src', 'content', 'guide');
const legalContentDir = join(rootDir, 'src', 'content', 'legal');
const guideOutputDir = join(rootDir, 'src', 'generated', 'guide');
const legalOutputDir = join(rootDir, 'src', 'generated', 'legal');

// Ensure output directories exist
mkdirSync(guideOutputDir, { recursive: true });
mkdirSync(legalOutputDir, { recursive: true });

// Guide files to process
const guides = [
  { contentDir: guideContentDir, outputDir: guideOutputDir, input: 'usage.md', output: 'usage.ts' },
  { contentDir: guideContentDir, outputDir: guideOutputDir, input: 'review-prompt.md', output: 'review-prompt.ts' },
  { contentDir: legalContentDir, outputDir: legalOutputDir, input: 'privacy.md', output: 'privacy.ts' },
  { contentDir: legalContentDir, outputDir: legalOutputDir, input: 'terms.md', output: 'terms.ts' },
];

console.log('Building guide HTML...');

for (const guide of guides) {
  const inputPath = join(guide.contentDir, guide.input);
  const outputPath = join(guide.outputDir, guide.output);

  try {
    // Read Markdown
    const markdown = readFileSync(inputPath, 'utf-8');

    // Convert to HTML
    const html = markdownToHtml(markdown, {
      embedOrigin: process.env.PUBLIC_EMBED_ORIGIN || '',
    });

    // Write as TypeScript module
    const tsContent = `// Auto-generated file - do not edit directly
// Generated from: ${guide.input}

export const htmlContent = ${JSON.stringify(html)};
`;

    writeFileSync(outputPath, tsContent, 'utf-8');
    console.log(`✓ Generated ${guide.output}`);
  } catch (error) {
    console.error(`✗ Failed to process ${guide.input}:`, error);
    process.exit(1);
  }
}

console.log('Guide HTML generation complete!');
