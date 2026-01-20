import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors());

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Embed endpoints will be added here
// app.get('/embed/twitter', handleTwitterEmbed);
// app.get('/embed/youtube', handleYouTubeEmbed);
// app.get('/embed/github', handleGitHubEmbed);

export default app;
