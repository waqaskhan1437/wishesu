/**
 * Forum Controller - Questions and Replies with moderation
 */

import { json } from '../utils/response.js';

/**
 * Ensure forum tables exist
 */
async function ensureForumTables(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS forum_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        slug TEXT UNIQUE,
        content TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        reply_count INTEGER DEFAULT 0,
        created_at INTEGER,
        updated_at INTEGER
      )
    `).run();
    
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS forum_replies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at INTEGER
      )
    `).run();
  } catch (e) {
    console.error('Forum table creation error:', e);
  }
}

/**
 * Get published questions for forum page with pagination
 */
export async function getPublishedQuestions(env, url) {
  try {
    await ensureForumTables(env);
    
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await env.DB.prepare(`
      SELECT COUNT(*) as total FROM forum_questions WHERE status = 'approved'
    `).first();
    const total = countResult?.total || 0;

    // Get paginated questions
    const result = await env.DB.prepare(`
      SELECT id, title, slug, content, name, reply_count, created_at
      FROM forum_questions 
      WHERE status = 'approved'
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(limit, offset).all();

    return json({
      success: true,
      questions: result.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: offset + limit < total,
        hasPrev: page > 1
      }
    });
  } catch (err) {
    console.error('getPublishedQuestions error:', err);
    return json({ error: err.message, questions: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }, 500);
  }
}

/**
 * Get single question with approved replies
 */
export async function getQuestion(env, slug) {
  try {
    const question = await env.DB.prepare(`
      SELECT * FROM forum_questions WHERE slug = ? AND status = 'approved'
    `).bind(slug).first();

    if (!question) {
      return json({ error: 'Question not found' }, 404);
    }

    // Get approved replies
    const replies = await env.DB.prepare(`
      SELECT id, name, content, created_at
      FROM forum_replies 
      WHERE question_id = ? AND status = 'approved'
      ORDER BY created_at ASC
    `).bind(question.id).all();

    return json({
      success: true,
      question,
      replies: replies.results || []
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Get replies for a question by ID (for expandable questions)
 */
export async function getQuestionReplies(env, questionId) {
  try {
    await ensureForumTables(env);
    
    if (!questionId) {
      return json({ replies: [] });
    }

    const replies = await env.DB.prepare(`
      SELECT id, name, content, created_at
      FROM forum_replies 
      WHERE question_id = ? AND status = 'approved'
      ORDER BY created_at ASC
    `).bind(questionId).all();

    return json({
      success: true,
      replies: replies.results || []
    });
  } catch (err) {
    console.error('getQuestionReplies error:', err);
    return json({ replies: [] });
  }
}

/**
 * Check if user has pending question or reply
 */
export async function checkPendingForum(env, email) {
  try {
    await ensureForumTables(env);
    
    // Check pending questions
    const pendingQuestion = await env.DB.prepare(`
      SELECT id FROM forum_questions 
      WHERE email = ? AND status = 'pending'
      LIMIT 1
    `).bind(email).first();

    // Check pending replies
    const pendingReply = await env.DB.prepare(`
      SELECT id FROM forum_replies 
      WHERE email = ? AND status = 'pending'
      LIMIT 1
    `).bind(email).first();

    return json({
      success: true,
      hasPending: !!(pendingQuestion || pendingReply),
      pendingType: pendingQuestion ? 'question' : (pendingReply ? 'reply' : null)
    });
  } catch (err) {
    console.error('checkPendingForum error:', err);
    return json({ success: true, hasPending: false }, 200);
  }
}

/**
 * Submit a new question
 */
export async function submitQuestion(env, body) {
  try {
    await ensureForumTables(env);
    
    const { title, content, name, email } = body;

    if (!title || !content || !name || !email) {
      return json({ error: 'All fields are required' }, 400);
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: 'Invalid email format' }, 400);
    }

    // Check for pending
    const pendingQ = await env.DB.prepare(`
      SELECT id FROM forum_questions WHERE email = ? AND status = 'pending' LIMIT 1
    `).bind(email.toLowerCase()).first();

    const pendingR = await env.DB.prepare(`
      SELECT id FROM forum_replies WHERE email = ? AND status = 'pending' LIMIT 1
    `).bind(email.toLowerCase()).first();

    if (pendingQ || pendingR) {
      return json({
        error: 'You have a pending question or reply awaiting approval. Please wait for it to be approved.',
        hasPending: true
      }, 400);
    }

    // Generate slug
    const slug = title.toLowerCase()
      .replace(/['"`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 80) + '-' + Date.now();

    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO forum_questions (title, slug, content, name, email, status, reply_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'pending', 0, ?, ?)
    `).bind(title.trim(), slug, content.trim(), name.trim(), email.toLowerCase().trim(), now, now).run();

    return json({
      success: true,
      message: 'Question submitted! It will appear after admin approval.'
    });
  } catch (err) {
    console.error('submitQuestion error:', err);
    return json({ error: 'Failed to submit question: ' + err.message }, 500);
  }
}

/**
 * Submit a reply to a question
 */
export async function submitReply(env, body) {
  try {
    const { question_id, content, name, email } = body;

    if (!question_id || !content || !name || !email) {
      return json({ error: 'All fields are required' }, 400);
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return json({ error: 'Invalid email format' }, 400);
    }

    // Check question exists and is approved
    const question = await env.DB.prepare(`
      SELECT id FROM forum_questions WHERE id = ? AND status = 'approved'
    `).bind(question_id).first();

    if (!question) {
      return json({ error: 'Question not found' }, 404);
    }

    // Check for pending
    const pendingQ = await env.DB.prepare(`
      SELECT id FROM forum_questions WHERE email = ? AND status = 'pending' LIMIT 1
    `).bind(email.toLowerCase()).first();

    const pendingR = await env.DB.prepare(`
      SELECT id FROM forum_replies WHERE email = ? AND status = 'pending' LIMIT 1
    `).bind(email.toLowerCase()).first();

    if (pendingQ || pendingR) {
      return json({
        error: 'You have a pending question or reply awaiting approval. Please wait for it to be approved.',
        hasPending: true
      }, 400);
    }

    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO forum_replies (question_id, name, email, content, status, created_at)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `).bind(question_id, name.trim(), email.toLowerCase().trim(), content.trim(), now).run();

    return json({
      success: true,
      message: 'Reply submitted! It will appear after admin approval.'
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Get all questions for admin
 */
export async function getAdminQuestions(env, url) {
  try {
    await ensureForumTables(env);
    
    const status = url.searchParams.get('status') || 'all';

    let query = 'SELECT * FROM forum_questions';
    if (status !== 'all') {
      query += ` WHERE status = '${status}'`;
    }
    query += ' ORDER BY created_at DESC';

    const result = await env.DB.prepare(query).all();

    // Get counts
    const pendingCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM forum_questions WHERE status = ?'
    ).bind('pending').first();

    const approvedCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM forum_questions WHERE status = ?'
    ).bind('approved').first();

    return json({
      success: true,
      questions: result.results || [],
      counts: {
        pending: pendingCount?.count || 0,
        approved: approvedCount?.count || 0
      }
    });
  } catch (err) {
    console.error('getAdminQuestions error:', err);
    return json({ success: true, questions: [], counts: { pending: 0, approved: 0 } }, 200);
  }
}

/**
 * Get all replies for admin
 */
export async function getAdminReplies(env, url) {
  try {
    await ensureForumTables(env);
    
    const status = url.searchParams.get('status') || 'all';
    const questionId = url.searchParams.get('question_id');

    let query = `
      SELECT r.*, q.title as question_title, q.slug as question_slug
      FROM forum_replies r
      LEFT JOIN forum_questions q ON r.question_id = q.id
    `;
    
    const conditions = [];
    if (status !== 'all') {
      conditions.push(`r.status = '${status}'`);
    }
    if (questionId) {
      conditions.push(`r.question_id = ${questionId}`);
    }
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY r.created_at DESC';

    const result = await env.DB.prepare(query).all();

    // Get counts
    const pendingCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM forum_replies WHERE status = ?'
    ).bind('pending').first();

    const approvedCount = await env.DB.prepare(
      'SELECT COUNT(*) as count FROM forum_replies WHERE status = ?'
    ).bind('approved').first();

    return json({
      success: true,
      replies: result.results || [],
      counts: {
        pending: pendingCount?.count || 0,
        approved: approvedCount?.count || 0
      }
    });
  } catch (err) {
    console.error('getAdminReplies error:', err);
    return json({ success: true, replies: [], counts: { pending: 0, approved: 0 } }, 200);
  }
}

/**
 * Update question status
 */
export async function updateQuestionStatus(env, body) {
  try {
    const { id, status } = body;

    if (!id || !status) {
      return json({ error: 'ID and status required' }, 400);
    }

    await env.DB.prepare(`
      UPDATE forum_questions SET status = ?, updated_at = ? WHERE id = ?
    `).bind(status, Date.now(), id).run();

    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Update reply status
 */
export async function updateReplyStatus(env, body) {
  try {
    const { id, status } = body;

    if (!id || !status) {
      return json({ error: 'ID and status required' }, 400);
    }

    // Get question_id to update reply count
    const reply = await env.DB.prepare('SELECT question_id FROM forum_replies WHERE id = ?').bind(id).first();

    await env.DB.prepare(`
      UPDATE forum_replies SET status = ? WHERE id = ?
    `).bind(status, id).run();

    // Update reply count
    if (reply) {
      const countResult = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM forum_replies WHERE question_id = ? AND status = 'approved'
      `).bind(reply.question_id).first();

      await env.DB.prepare(`
        UPDATE forum_questions SET reply_count = ? WHERE id = ?
      `).bind(countResult?.count || 0, reply.question_id).run();
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Delete question
 */
export async function deleteQuestion(env, id) {
  try {
    if (!id) {
      return json({ error: 'Question ID required' }, 400);
    }

    // Delete replies first
    await env.DB.prepare('DELETE FROM forum_replies WHERE question_id = ?').bind(id).run();
    // Delete question
    await env.DB.prepare('DELETE FROM forum_questions WHERE id = ?').bind(id).run();

    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Delete reply
 */
export async function deleteReply(env, id) {
  try {
    if (!id) {
      return json({ error: 'Reply ID required' }, 400);
    }

    // Get question_id before delete
    const reply = await env.DB.prepare('SELECT question_id FROM forum_replies WHERE id = ?').bind(id).first();

    await env.DB.prepare('DELETE FROM forum_replies WHERE id = ?').bind(id).run();

    // Update reply count
    if (reply) {
      const countResult = await env.DB.prepare(`
        SELECT COUNT(*) as count FROM forum_replies WHERE question_id = ? AND status = 'approved'
      `).bind(reply.question_id).first();

      await env.DB.prepare(`
        UPDATE forum_questions SET reply_count = ? WHERE id = ?
      `).bind(countResult?.count || 0, reply.question_id).run();
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

/**
 * Get sidebar content (products and blogs based on question id for internal linking)
 */
export async function getForumSidebar(env, questionId) {
  try {
    // Get 2 products created before/around this question (for internal linking sequence)
    // Products with id <= questionId (older products for older questions)
    const products = await env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url, sale_price, normal_price
      FROM products 
      WHERE status = 'active'
      ORDER BY id DESC
      LIMIT 2 OFFSET ?
    `).bind(Math.max(0, questionId - 1)).all();

    // Get 2 blog posts created before/around this question
    const blogs = await env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url, description
      FROM blogs 
      WHERE status = 'published'
      ORDER BY id DESC
      LIMIT 2 OFFSET ?
    `).bind(Math.max(0, questionId - 1)).all();

    return json({
      success: true,
      products: products.results || [],
      blogs: blogs.results || []
    });
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}
