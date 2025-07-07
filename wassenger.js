'use strict';

const axios = require('axios');
const FormData = require('form-data');
const db = require('./db');

// Wassenger API configuration
const WASSENGER_API_KEY = process.env.WASSENGER_API_KEY;
const WASSENGER_DEVICE_ID = process.env.WASSENGER_DEVICE_ID;
const WASSENGER_API_URL = 'https://api.wassenger.com/v1';

// Axios instance with auth header
const wassengerApi = axios.create({
  baseURL: WASSENGER_API_URL,
  headers: {
    'Token': WASSENGER_API_KEY,
    'Content-Type': 'application/json'
  }
});

/**
 * Send a text message via Wassenger API
 * @param {string} recipient - Phone number in international format
 * @param {string} message - Message text to send
 */
async function sendMessage(recipient, message) {
  try {
    const response = await wassengerApi.post('/messages', {
      phone: recipient,
      message: message,
      device: WASSENGER_DEVICE_ID
    });
    
    console.log('Message sent successfully:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send media message via Wassenger API
 * @param {string} recipient - Phone number in international format
 * @param {string} mediaUrl - URL of the media to send
 * @param {string} caption - Optional caption for the media
 */
async function sendMediaMessage(recipient, mediaUrl, caption = '') {
  try {
    const response = await wassengerApi.post('/messages', {
      phone: recipient,
      media: {
        url: mediaUrl
      },
      caption: caption,
      device: WASSENGER_DEVICE_ID
    });
    
    console.log('Media message sent successfully:', response.data.id);
    return response.data;
  } catch (error) {
    console.error('Error sending media message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Download media from Wassenger and store in MySQL database
 * @param {string} mediaUrl - URL of the media from webhook
 * @param {Object} metadata - Media metadata (inspector_id, media_type, etc.)
 */
async function downloadAndStoreMedia(mediaUrl, metadata) {
  try {
    // Download media file
    const response = await axios({
      method: 'GET',
      url: mediaUrl,
      responseType: 'arraybuffer',
      headers: {
        'Token': WASSENGER_API_KEY
      }
    });
    
    // Store media in database
    const mediaId = await db.storeMedia(
      metadata.inspector_id,
      metadata.contract_id || null,
      metadata.task_name || null,
      metadata.media_type,
      metadata.filename,
      metadata.mimetype,
      response.data  // Binary data
    );
    
    console.log(`Media downloaded and stored with ID: ${mediaId}`);
    return mediaId;
  } catch (error) {
    console.error('Error downloading and storing media:', error);
    throw error;
  }
}

/**
 * Verify webhook signature
 * @param {string} signature - Signature from X-Hub-Signature header
 * @param {string} body - Raw request body
 * @param {string} secret - Webhook secret key
 */
function verifyWebhook(signature, body, secret) {
  // In a production environment, implement signature verification
  // to ensure the webhook is coming from Wassenger
  return true;
}

module.exports = {
  sendMessage,
  sendMediaMessage,
  downloadAndStoreMedia,
  verifyWebhook
};
