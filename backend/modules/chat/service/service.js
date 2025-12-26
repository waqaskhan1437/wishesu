export async function createSession(db, sessionId) {
  await db.prepare(
    `INSERT OR IGNORE INTO chat_sessions (id, status) VALUES (?, 'open')`
  ).bind(sessionId).run();
  return sessionId;
}

export async function addMessage(db, data) {
  return db.prepare(
    `INSERT INTO chat_messages (session_id, sender, message)
     VALUES (?, ?, ?)`
  ).bind(data.sessionId, data.sender, data.message).run();
}

export async function getMessages(db, sessionId, sinceId) {
  const stmt = db.prepare(
    `SELECT * FROM chat_messages
     WHERE session_id = ? AND id > ?
     ORDER BY id ASC`
  ).bind(sessionId, Number(sinceId || 0));
  const result = await stmt.all();
  return result.results || [];
}
