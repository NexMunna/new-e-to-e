<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Property Stewards Inspector Interface - Copilot Instructions

This is a Node.js AWS Lambda project for a WhatsApp-based property inspection system. When generating code, keep the following in mind:

## API Integrations
- **Wassenger API**: Used for WhatsApp messaging
- **OpenAI API**: Used for processing natural language with GPT-4o-mini

## Database
- MySQL is used for all data storage
- Media files (images/videos) are stored as BLOBs in MySQL
- No S3 or external storage is used

## Architecture
- Serverless architecture using AWS Lambda
- No web UI or app, all interaction is through WhatsApp
- Session management via MySQL

## Code Style
- Modern JavaScript (Node.js v18+)
- Async/await patterns for asynchronous operations
- Error handling with try/catch
- Use of environment variables for configuration

## Features
- WhatsApp webhook via Wassenger
- Conversation handling with GPT
- Media uploading and storage
- Task management for inspectors
- Scheduling and rescheduling jobs
- Admin notifications via cron jobs
