import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { tweetHandler } from './handlers/tweet';
import { githubHandler } from './handlers/github';
import { gistHandler } from './handlers/gist';
import { cardHandler } from './handlers/card';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Embed endpoints
// Each endpoint receives ?url=<encoded-url> and returns complete HTML for iframe
app.get('/tweet', tweetHandler);
app.get('/github', githubHandler);
app.get('/gist', gistHandler);
app.get('/card', cardHandler);

export default app;
