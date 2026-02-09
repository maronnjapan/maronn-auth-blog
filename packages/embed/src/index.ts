import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { tweetHandler } from './handlers/tweet';
import { githubHandler } from './handlers/github';
import { gistHandler } from './handlers/gist';
import { cardHandler } from './handlers/card';
import { mermaidHandler } from './handlers/mermaid';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Embed endpoints.
// Each endpoint:
// - With ?url=<encoded-url>: Returns complete HTML for iframe
// - Without query: Returns loader that fetches URL from parent's data-content attribute via postMessage
app.get('/tweet', tweetHandler);
app.get('/github', githubHandler);
app.get('/gist', gistHandler);
app.get('/card', cardHandler);
app.get('/mermaid', mermaidHandler);

export default app;
