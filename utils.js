'use strict';

const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');

/**
 * Generate a report URL for a completed job
 * @param {number} contractId - Contract ID
 */
async function generateJobReport(contractId) {
  try {
    // In a real implementation, this would generate a PDF report
    // and store it somewhere accessible via URL
    
    // For demonstration, we'll simulate report generation
    const reportId = uuidv4();
    const reportUrl = `https://reports.propertystewards.com/report/${reportId}`;
    
    // Return report details
    return {
      reportId,
      reportUrl,
      generatedAt: moment().format('YYYY-MM-DD HH:mm:ss')
    };
  } catch (error) {
    console.error('Error generating job report:', error);
    throw error;
  }
}

/**
 * Format work orders for WhatsApp display
 * @param {Array} workOrders - Work orders from database
 */
function formatWorkOrdersForDisplay(workOrders) {
  if (workOrders.length === 0) {
    return 'No jobs scheduled for the requested date.';
  }
  
  let message = `You have ${workOrders.length} job(s) scheduled:\n\n`;
  
  workOrders.forEach((job, index) => {
    const jobTime = moment(job.scheduled_date).format('h:mm A');
    
    message += `${index + 1}. ${job.client_name}\n`;
    message += `   Address: ${job.address}\n`;
    message += `   Time: ${jobTime}\n`;
    message += `   Job ID: ${job.work_order_id}\n`;
    message += `   Contract ID: ${job.contract_id}\n\n`;
  });
  
  return message;
}

/**
 * Format checklist items for WhatsApp display
 * @param {Array} checklistItems - Checklist items from database
 * @param {string} roomName - Room name
 */
function formatChecklistForDisplay(checklistItems, roomName) {
  if (checklistItems.length === 0) {
    return `No checklist items found for ${roomName}.`;
  }
  
  let message = `Checklist for ${roomName}:\n\n`;
  
  checklistItems.forEach((item, index) => {
    const status = item.status === 'completed' ? '✅' : '⬜';
    message += `${status} ${index + 1}. ${item.task_name}\n`;
  });
  
  return message;
}

/**
 * Validate and format phone number
 * @param {string} phone - Phone number to validate
 */
function validateAndFormatPhone(phone) {
  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Check if it's a valid number (simplified validation)
  if (digits.length < 10) {
    return null;
  }
  
  // Ensure it has country code (simplified)
  if (!digits.startsWith('1') && !digits.startsWith('91')) {
    return `+${digits}`;
  }
  
  return `+${digits}`;
}

module.exports = {
  generateJobReport,
  formatWorkOrdersForDisplay,
  formatChecklistForDisplay,
  validateAndFormatPhone
};
