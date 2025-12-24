/**
 * Render forum topic page.
 */

import { getForumTopic, getForumReplies, getForumLatestTopics } from './topic-data.js';
import { buildReplyItems, buildTopicLatest } from './topic-markup.js';
import { toParagraphs } from '../helpers.js';
import { buildTopicHtml } from './topic-template.js';

export async function renderForumTopic(env, slug) {
  const topic = await getForumTopic(env, slug);
  if (!topic) return new Response('Not found', { status: 404 });

  const replies = await getForumReplies(env, topic.id);
  const latest = await getForumLatestTopics(env, 6);

  const replyItems = buildReplyItems(replies);
  const latestItems = buildTopicLatest(latest);
  const repliesHtml = {
    body: toParagraphs(topic.body || ''),
    items: replyItems
  };

  const html = buildTopicHtml(topic, repliesHtml, latestItems);

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
