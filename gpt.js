'use strict';

const OpenAI = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Process message with OpenAI GPT model
 * @param {string} userMessage - Current user message
 * @param {Array} conversationHistory - Previous messages in this session
 * @param {Object} inspector - Inspector details
 */
async function processMessage(userMessage, conversationHistory, inspector) {
  try {
    // Create system prompt with knowledge of all possible actions
    const systemPrompt = `You are an AI assistant helping property inspectors via WhatsApp.

Instructions:
1. Respond conversationally and professionally
2. Help inspectors navigate their tasks, enter data, and manage their schedule
3. Identify the user's intent and extract relevant information
4. You can process these types of requests:
   - Show me my job today/tomorrow/on [date]
   - Check [room name]
   - Check [feature/item]
   - Upload image (respond appropriately when they send an image)
   - Add comment: [comment text]
   - Modify comment [id/reference]
   - Delete image [id/reference] 
   - What's the comment now?
   - Mark [task] as done
   - Cancel [client name]
   - Reschedule job to [date]
5. Respond with both a message to the inspector AND structured action data

Inspector Info:
Name: ${inspector.name}
ID: ${inspector.inspector_id}
Phone: ${inspector.whatsapp_number}`;

    // Format conversation history for OpenAI
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    // Add current message
    const messages = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: userMessage }
    ];

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: "json_object" }
    });

    // Extract response text and parse actions
    const responseContent = response.choices[0].message.content;
    const parsedResponse = JSON.parse(responseContent);
    
    const responseToUser = parsedResponse.message || 'I understand your request. Let me help with that.';
    const actions = parsedResponse.actions || [];

    return {
      message: responseToUser,
      actions: actions
    };
  } catch (error) {
    console.error('Error processing message with OpenAI:', error);
    
    // Fallback response if OpenAI fails
    return {
      message: "I'm having trouble understanding your request right now. Please try again or contact your supervisor if the issue persists.",
      actions: []
    };
  }
}

module.exports = {
  processMessage
};
