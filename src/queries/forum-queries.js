/**
 * Forum Queries - Database queries for forum
 * Consolidated from router.js and controllers
 */

import { queryOne, queryAll, runQuery, countRows } from '../utils/db-helpers.js';

export async function getForumQuestionById(env, id) {
  return queryOne(env, 'SELECT * FROM forum_questions WHERE id = ?', [Number(id)]);
}

export async function getForumQuestionBySlug(env, slug) {
  return queryOne(env, 'SELECT * FROM forum_questions WHERE slug = ?', [slug]);
}

export async function getAllForumQuestions(env, options = {}) {
  const { limit = 20, offset = 0, status = 'approved' } = options;
  const where = status ? 'WHERE status = ?' : '';
  const bindings = status ? [status] : [];
  const sql = `SELECT * FROM forum_questions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [...bindings, limit, offset]);
}

export async function getForumQuestionCount(env, status = null) {
  if (status) {
    return countRows(env, 'forum_questions', 'WHERE status = ?', [status]);
  }
  return countRows(env, 'forum_questions');
}

export async function createForumQuestion(env, questionData) {
  const { title, slug, content, name, email, status } = questionData;
  const sql = `INSERT INTO forum_questions (title, slug, content, name, email, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  return runQuery(env, sql, [title, slug, content, name, email, status || 'pending', Date.now()]);
}

export async function updateForumQuestion(env, id, questionData) {
  const keys = Object.keys(questionData);
  const values = Object.values(questionData);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const sql = `UPDATE forum_questions SET ${setClause}, updated_at = ? WHERE id = ?`;
  return runQuery(env, sql, [...values, Date.now(), id]);
}

export async function deleteForumQuestion(env, id) {
  return runQuery(env, 'DELETE FROM forum_questions WHERE id = ?', [id]);
}

export async function getForumReplies(env, questionId, options = {}) {
  const { limit = 50, offset = 0, status = 'approved' } = options;
  const sql = `SELECT * FROM forum_replies WHERE question_id = ? AND status = ? ORDER BY created_at ASC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [questionId, status, limit, offset]);
}

export async function createForumReply(env, replyData) {
  const { question_id, name, email, content, status } = replyData;
  const sql = `INSERT INTO forum_replies (question_id, name, email, content, status, created_at) VALUES (?, ?, ?, ?, ?, ?)`;
  return runQuery(env, sql, [question_id, name, email, content, status || 'pending', Date.now()]);
}

export async function updateForumReply(env, id, replyData) {
  const keys = Object.keys(replyData);
  const values = Object.values(replyData);
  const setClause = keys.map(k => `${k} = ?`).join(', ');
  const sql = `UPDATE forum_replies SET ${setClause} WHERE id = ?`;
  return runQuery(env, sql, [...values, id]);
}

export async function deleteForumReply(env, id) {
  return runQuery(env, 'DELETE FROM forum_replies WHERE id = ?', [id]);
}

export async function searchForumQuestions(env, searchTerm, options = {}) {
  const { limit = 20, offset = 0, status = 'approved' } = options;
  const searchPattern = `%${searchTerm}%`;
  const sql = `SELECT * FROM forum_questions WHERE (title LIKE ? OR content LIKE ?) AND status = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  return queryAll(env, sql, [searchPattern, searchPattern, status, limit, offset]);
}

export async function incrementReplyCount(env, questionId) {
  const sql = `UPDATE forum_questions SET reply_count = reply_count + 1 WHERE id = ?`;
  return runQuery(env, sql, [questionId]);
}
