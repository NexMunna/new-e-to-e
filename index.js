'use strict';

const db = require('./db');
const gpt = require('./gpt');
const wassenger = require('./wassenger');
const utils = require('./utils');

/**
 * Main Lambda handler function
 * Processes incoming Wassenger webhook events
 */
exports.handler = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Parse the incoming webhook payload
    const body = JSON.parse(event.body || '{}');
    console.log('Received webhook:', JSON.stringify(body));

    // Only process message events
    if (!body.event || body.event !== 'message') {
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'ignored', message: 'Not a message event' })
      };
    }

    // Extract message data
    const message = body.data;
    const whatsappNumber = message.phone || message.fromNumber;
    
    if (!whatsappNumber) {
      throw new Error('Missing WhatsApp number in webhook payload');
    }

    // Get inspector details by WhatsApp number
    const inspector = await db.getInspectorByPhone(whatsappNumber);
    if (!inspector) {
      console.warn(`Unrecognized WhatsApp number: ${whatsappNumber}`);
      await wassenger.sendMessage(whatsappNumber, 'Sorry, your number is not registered in our system. Please contact Property Stewards admin.');
      return {
        statusCode: 200,
        body: JSON.stringify({ status: 'rejected', message: 'Unregistered phone number' })
      };
    }

    // Get or create chat session
    const session = await db.getOrCreateChatSession(inspector.inspector_id);

    // Process message based on type
    let processedContent;
    let mediaId = null;

    if (message.type === 'image' || message.type === 'video') {
      // Handle media message
      const mediaUrl = message.url || message.media?.url;
      if (mediaUrl) {
        // Download and store media in database
        const mediaMetadata = {
          inspector_id: inspector.inspector_id,
          media_type: message.type,
          filename: message.media?.filename || `${message.type}_${Date.now()}`,
          mimetype: message.media?.mimetype || `${message.type}/*`
        };
        
        mediaId = await wassenger.downloadAndStoreMedia(mediaUrl, mediaMetadata);
        processedContent = `[Uploaded ${message.type}]`;
      } else {
        processedContent = `[Received ${message.type} but URL is missing]`;
      }
    } else if (message.type === 'text') {
      // Handle text message
      processedContent = message.body || message.text;
    } else {
      // Handle other types
      processedContent = `[Received ${message.type} message]`;
    }

    // Update session with new message
    await db.addMessageToSession(session.session_id, 'user', processedContent, mediaId);
    
    // Get conversation history
    const conversationHistory = await db.getSessionHistory(session.session_id);
    
    // Process message with GPT to determine intent and actions
    const gptResponse = await gpt.processMessage(
      processedContent, 
      conversationHistory, 
      inspector
    );
    
    // Store GPT response in session
    await db.addMessageToSession(session.session_id, 'assistant', gptResponse.message);
    
    // Execute actions based on GPT's analysis
    if (gptResponse.actions && gptResponse.actions.length > 0) {
      for (const action of gptResponse.actions) {
        await executeAction(action, inspector, session);
      }
    }

    // Send response back to WhatsApp
    await wassenger.sendMessage(whatsappNumber, gptResponse.message);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: 'success',
        message: 'Message processed successfully'
      })
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        status: 'error',
        message: 'Internal server error',
        error: error.message
      })
    };
  }
};

/**
 * Executes actions based on GPT's analysis
 */
async function executeAction(action, inspector, session) {
  const { type, params } = action;
  
  switch (type) {
    case 'GET_JOBS': {
      // Fetch jobs for today or specified date
      const date = params.date || new Date().toISOString().split('T')[0];
      const jobs = await db.getWorkOrders(inspector.inspector_id, date);
      return { jobs };
    }
    
    case 'CHECK_ROOM': {
      // Get checklist items for a specific room
      const { contractId, roomName } = params;
      const checklist = await db.getChecklistItems(contractId, roomName);
      return { checklist };
    }
    
    case 'ADD_COMMENT': {
      // Add a comment to a task
      const { contractId, taskName, commentText } = params;
      const commentId = await db.addComment(inspector.inspector_id, contractId, taskName, commentText);
      return { commentId };
    }
    
    case 'MODIFY_COMMENT': {
      // Modify existing comment
      const { commentId, newText } = params;
      await db.updateComment(commentId, newText);
      return { success: true };
    }
    
    case 'DELETE_MEDIA': {
      // Delete media file
      const { mediaId } = params;
      await db.deleteMedia(mediaId);
      return { success: true };
    }
    
    case 'GET_COMMENT': {
      // Retrieve comment details
      const { commentId } = params;
      const comment = await db.getComment(commentId);
      return { comment };
    }
    
    case 'MARK_TASK_DONE': {
      // Mark task as complete
      const { contractId, taskName } = params;
      await db.markTaskComplete(contractId, taskName, inspector.inspector_id);
      return { success: true };
    }
    
    case 'CANCEL_JOB': {
      // Cancel a job
      const { contractId, reason } = params;
      await db.cancelContract(contractId, reason);
      return { success: true };
    }
    
    case 'RESCHEDULE_JOB': {
      // Reschedule a job
      const { contractId, newDate } = params;
      await db.rescheduleContract(contractId, newDate);
      return { success: true };
    }
    
    default:
      console.warn(`Unknown action type: ${type}`);
      return null;
  }
}

// Handle cron job for daily admin notification
exports.dailyAdminNotification = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Get pending leads older than 48h
    const pendingLeads = await db.getPendingLeads(48);
    
    if (pendingLeads.length > 0) {
      // Format and send notification
      const message = `ALERT: ${pendingLeads.length} leads pending for more than 48 hours:\n\n` + 
        pendingLeads.map(lead => `- ${lead.client_name}: ${lead.description} (since ${lead.created_at})`).join('\n');
      
      // Send to admin (could be email or WhatsApp)
      const adminContact = process.env.ADMIN_CONTACT;
      await wassenger.sendMessage(adminContact, message);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success', message: 'Admin notification processed' })
    };
  } catch (error) {
    console.error('Error processing admin notification:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', message: error.message })
    };
  }
};

// Handle completed job reports
exports.completedJobReport = async (event, context) => {
  context.callbackWaitsForEmptyEventLoop = false;
  
  try {
    // Get newly completed jobs
    const completedJobs = await db.getNewlyCompletedJobs();
    
    for (const job of completedJobs) {
      // Generate job report
      const report = await utils.generateJobReport(job.contract_id);
      
      // Send report notification
      const adminContact = process.env.ADMIN_CONTACT;
      await wassenger.sendMessage(
        adminContact, 
        `Job #${job.contract_id} for ${job.client_name} has been completed.\n` +
        `Report is available at: ${report.reportUrl}`
      );
      
      // Mark report as sent
      await db.markReportSent(job.contract_id);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'success', message: 'Completed job reports processed' })
    };
  } catch (error) {
    console.error('Error processing completed job reports:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ status: 'error', message: error.message })
    };
  }
};
