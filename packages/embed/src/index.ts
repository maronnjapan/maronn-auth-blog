import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { tweetHandler, tweetPageHandler } from './handlers/tweet';
import { githubHandler, githubPageHandler } from './handlers/github';
import { gistHandler, gistPageHandler } from './handlers/gist';
import { cardHandler, cardPageHandler } from './handlers/card';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Embed page endpoints (served in iframe)
// These pages load JavaScript that fetches data from parent iframe's data-content
app.get('/tweet', tweetPageHandler);
app.get('/github', githubPageHandler);
app.get('/gist', gistPageHandler);
app.get('/card', cardPageHandler);

// API endpoints for fetching embed data
app.get('/api/tweet', tweetHandler);
app.get('/api/github', githubHandler);
app.get('/api/gist', gistHandler);
app.get('/api/card', cardHandler);

export default app;
