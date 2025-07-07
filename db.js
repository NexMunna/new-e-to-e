'use strict';

const mysql = require('mysql2/promise');
const moment = require('moment');

// Create MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * Get inspector by WhatsApp phone number
 */
async function getInspectorByPhone(phone) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM inspectors WHERE whatsapp_number = ?',
      [phone]
    );
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting inspector by phone:', error);
    throw error;
  }
}

/**
 * Get or create a chat session for an inspector
 */
async function getOrCreateChatSession(inspectorId) {
  try {
    // Check for existing active session (less than 24 hours old)
    const [sessions] = await pool.execute(
      'SELECT * FROM chat_sessions WHERE inspector_id = ? AND created_at > ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1',
      [inspectorId, moment().subtract(24, 'hours').format('YYYY-MM-DD HH:mm:ss')]
    );
    
    if (sessions.length > 0) {
      return sessions[0];
    }
    
    // Create new session
    const [result] = await pool.execute(
      'INSERT INTO chat_sessions (inspector_id, created_at, last_interaction, is_active) VALUES (?, NOW(), NOW(), 1)',
      [inspectorId]
    );
    
    // Return the new session
    return {
      session_id: result.insertId,
      inspector_id: inspectorId,
      created_at: new Date(),
      last_interaction: new Date(),
      is_active: 1
    };
  } catch (error) {
    console.error('Error getting/creating chat session:', error);
    throw error;
  }
}

/**
 * Add message to chat session
 */
async function addMessageToSession(sessionId, sender, content, mediaId = null) {
  try {
    await pool.execute(
      'INSERT INTO chat_messages (session_id, sender, content, media_id, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [sessionId, sender, content, mediaId]
    );
    
    // Update last interaction time
    await pool.execute(
      'UPDATE chat_sessions SET last_interaction = NOW() WHERE session_id = ?',
      [sessionId]
    );
  } catch (error) {
    console.error('Error adding message to session:', error);
    throw error;
  }
}

/**
 * Get session history for GPT context
 */
async function getSessionHistory(sessionId) {
  try {
    const [rows] = await pool.execute(
      'SELECT sender, content, timestamp FROM chat_messages WHERE session_id = ? ORDER BY timestamp ASC',
      [sessionId]
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting session history:', error);
    throw error;
  }
}

/**
 * Store media file in database
 */
async function storeMedia(inspectorId, contractId, taskName, mediaType, fileName, mimeType, binaryData) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO media 
      (inspector_id, contract_id, task_name, media_type, filename, mimetype, file_data, uploaded_at) 
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [inspectorId, contractId || null, taskName || null, mediaType, fileName, mimeType, binaryData]
    );
    
    return result.insertId;
  } catch (error) {
    console.error('Error storing media:', error);
    throw error;
  }
}

/**
 * Get media by ID
 */
async function getMedia(mediaId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM media WHERE media_id = ?',
      [mediaId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting media:', error);
    throw error;
  }
}

/**
 * Delete media by ID
 */
async function deleteMedia(mediaId) {
  try {
    await pool.execute(
      'DELETE FROM media WHERE media_id = ?',
      [mediaId]
    );
    
    return true;
  } catch (error) {
    console.error('Error deleting media:', error);
    throw error;
  }
}

/**
 * Get work orders for inspector on a specific date
 */
async function getWorkOrders(inspectorId, date) {
  try {
    const [rows] = await pool.execute(
      `SELECT w.*, c.client_name, c.address, c.phone 
      FROM work_orders w
      JOIN contracts c ON w.contract_id = c.contract_id
      WHERE w.inspector_id = ? AND DATE(w.scheduled_date) = ? AND w.status != 'cancelled'`,
      [inspectorId, date]
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting work orders:', error);
    throw error;
  }
}

/**
 * Get checklist items for a room in a contract
 */
async function getChecklistItems(contractId, roomName) {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM contract_checklists 
      WHERE contract_id = ? AND room_name = ?`,
      [contractId, roomName]
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting checklist items:', error);
    throw error;
  }
}

/**
 * Add a comment to a task
 */
async function addComment(inspectorId, contractId, taskName, commentText) {
  try {
    const [result] = await pool.execute(
      `INSERT INTO comments 
      (inspector_id, contract_id, task_name, comment_text, created_at) 
      VALUES (?, ?, ?, ?, NOW())`,
      [inspectorId, contractId, taskName, commentText]
    );
    
    return result.insertId;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}

/**
 * Update a comment
 */
async function updateComment(commentId, newText) {
  try {
    await pool.execute(
      'UPDATE comments SET comment_text = ?, updated_at = NOW() WHERE comment_id = ?',
      [newText, commentId]
    );
    
    return true;
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
}

/**
 * Get comment by ID
 */
async function getComment(commentId) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM comments WHERE comment_id = ?',
      [commentId]
    );
    
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error('Error getting comment:', error);
    throw error;
  }
}

/**
 * Mark task as complete
 */
async function markTaskComplete(contractId, taskName, inspectorId) {
  try {
    await pool.execute(
      `UPDATE contract_checklists 
      SET status = 'completed', completed_at = NOW(), completed_by = ? 
      WHERE contract_id = ? AND task_name = ?`,
      [inspectorId, contractId, taskName]
    );
    
    return true;
  } catch (error) {
    console.error('Error marking task complete:', error);
    throw error;
  }
}

/**
 * Cancel a contract
 */
async function cancelContract(contractId, reason) {
  try {
    await pool.execute(
      'UPDATE contracts SET status = \'cancelled\', cancellation_reason = ? WHERE contract_id = ?',
      [reason, contractId]
    );
    
    await pool.execute(
      'UPDATE work_orders SET status = \'cancelled\' WHERE contract_id = ?',
      [contractId]
    );
    
    return true;
  } catch (error) {
    console.error('Error cancelling contract:', error);
    throw error;
  }
}

/**
 * Reschedule a contract
 */
async function rescheduleContract(contractId, newDate) {
  try {
    await pool.execute(
      'UPDATE work_orders SET scheduled_date = ?, status = \'rescheduled\' WHERE contract_id = ?',
      [newDate, contractId]
    );
    
    return true;
  } catch (error) {
    console.error('Error rescheduling contract:', error);
    throw error;
  }
}

/**
 * Get pending leads older than X hours
 */
async function getPendingLeads(hoursThreshold) {
  try {
    const [rows] = await pool.execute(
      `SELECT * FROM contracts 
      WHERE status = 'pending' AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
      [hoursThreshold]
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting pending leads:', error);
    throw error;
  }
}

/**
 * Get newly completed jobs (completed but report not yet sent)
 */
async function getNewlyCompletedJobs() {
  try {
    const [rows] = await pool.execute(
      `SELECT c.*, cl.client_name 
      FROM contracts c
      JOIN clients cl ON c.client_id = cl.client_id
      WHERE c.status = 'completed' AND c.report_sent = 0`
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting newly completed jobs:', error);
    throw error;
  }
}

/**
 * Mark report as sent
 */
async function markReportSent(contractId) {
  try {
    await pool.execute(
      'UPDATE contracts SET report_sent = 1 WHERE contract_id = ?',
      [contractId]
    );
    
    return true;
  } catch (error) {
    console.error('Error marking report as sent:', error);
    throw error;
  }
}

module.exports = {
  getInspectorByPhone,
  getOrCreateChatSession,
  addMessageToSession,
  getSessionHistory,
  storeMedia,
  getMedia,
  deleteMedia,
  getWorkOrders,
  getChecklistItems,
  addComment,
  updateComment,
  getComment,
  markTaskComplete,
  cancelContract,
  rescheduleContract,
  getPendingLeads,
  getNewlyCompletedJobs,
  markReportSent
};
