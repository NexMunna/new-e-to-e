# Property Stewards Inspector Interface

A WhatsApp-based inspection system built on AWS Lambda that allows property inspectors to manage their inspection tasks entirely through WhatsApp.

## System Architecture

This serverless application handles inspection processes through:
- WhatsApp messaging via Wassenger Webhook API
- Natural language processing using OpenAI GPT-4o-mini
- MySQL database for data storage (including BLOB storage for media)
- AWS Lambda for serverless computing

## Features

- **WhatsApp Bot Integration**: Seamless communication through Wassenger webhook
- **Conversational AI**: Natural language understanding with GPT-4o-mini
- **Media Handling**: Store images and videos directly in MySQL as BLOB
- **Session Management**: Stateful conversations persisted in database
- **Task Management**: View, complete, and comment on inspection tasks
- **Scheduling**: View, cancel, and reschedule jobs

## Project Structure

```
/project-root
  ├── index.js          # Lambda entry point and main webhook handler
  ├── db.js             # MySQL database interactions
  ├── gpt.js            # OpenAI GPT integration
  ├── wassenger.js      # WhatsApp communication via Wassenger API
  ├── utils.js          # Utility functions
  ├── sql/schema.sql    # MySQL database schema
  ├── package.json      # Project dependencies
  └── README.md         # Documentation
```

## Prerequisites

- Node.js 18+
- MySQL database server
- AWS account with Lambda access
- Wassenger business account for WhatsApp API
- OpenAI API access

## Installation & Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up MySQL database:
   - Create a database
   - Run the SQL commands in `sql/schema.sql` to create the required tables

4. Configure environment variables:
   ```
   DB_HOST=your_mysql_host
   DB_USER=your_mysql_user
   DB_PASS=your_mysql_password
   DB_NAME=your_mysql_database_name
   WASSENGER_API_KEY=your_wassenger_api_key
   OPENAI_API_KEY=your_openai_api_key
   ADMIN_CONTACT=admin_whatsapp_number
   ```

## Deployment to AWS Lambda

1. Create a deployment package:
   ```bash
   npm install
   zip -r package.zip .
   ```

2. Create a new AWS Lambda function:
   - Runtime: Node.js 18.x
   - Handler: index.handler
   - Upload the package.zip file
   - Set the environment variables listed above

3. Set up an API Gateway:
   - Create a new REST API
   - Create a POST method and link it to your Lambda function
   - Deploy the API and note the endpoint URL

4. Configure Wassenger webhook:
   - Log into your Wassenger account
   - Go to Webhooks section
   - Add a new webhook with the API Gateway endpoint URL
   - Select the message event to trigger the webhook

## Setting up the Cron Jobs

1. Create a second Lambda function or use the same one with a different handler:
   - For admin notification: `index.dailyAdminNotification`
   - For completed job reports: `index.completedJobReport`

2. Set up AWS EventBridge (CloudWatch Events) to trigger:
   - Admin notification every day at 1 AM: `cron(0 1 * * ? *)`
   - Completed job reports every hour: `cron(0 * * * ? *)`

## Testing the System

You can test the webhook handling locally with:

```bash
npm run start-local
```

This uses a sample event from test/sample-event.json to simulate a Wassenger webhook.

## Supported User Intents

The system can understand and process the following intents from WhatsApp messages:

- "Show me my job today"
- "Check Bedroom 1"
- "Check windows"
- "Upload image" (when sending an image)
- "Add comment: leaking window"
- "Modify comment"
- "Delete image"
- "What's the comment now?"
- "Mark as done"
- "Cancel Mr. Tan"
- "Reschedule job"

## License

Proprietary - Property Stewards

## Support

For support, contact the IT department at Property Stewards.
