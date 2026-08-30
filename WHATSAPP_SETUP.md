# WhatsApp Chatbot Integration Guide for KopargaonPriority

This guide walks you through integrating WhatsApp with the Kopargaon Civic Decision Platform so citizens can file complaints via WhatsApp chatbot.

## Overview

Citizens can now:
1. Message the WhatsApp Business account
2. Go through a guided chatbot conversation
3. Select complaint category (Roads, Water, Drainage, etc.)
4. Choose their ward
5. Provide location, title, and description
6. Receive a ticket number for tracking

## Architecture

```
WhatsApp User
    ↓
WhatsApp Business API (Meta/Facebook)
    ↓
Your Webhook (POST /api/whatsapp/webhook)
    ↓
Chatbot Service (whatsappService.ts)
    ↓
Complaint Storage (complaintStorage.ts)
    ↓
Complaint Database & Tracking
```

## Prerequisites

1. **Facebook Business Account** - Required to access WhatsApp Business API
2. **WhatsApp Business App** - Approved WhatsApp Business Account
3. **Meta App** - Create an app in Meta Developers Console
4. **Your Server** - Must be accessible via HTTPS with valid SSL certificate
5. **Node.js Environment** - Already set up with this project

## Step-by-Step Setup

### Step 1: Create Meta Business Account

1. Go to [Meta Developers](https://developers.facebook.com/)
2. Sign in with your Facebook account
3. Create or select a Business Account
4. Create a new App → Select "WhatsApp" category
5. Name your app: "KopargaonPriority WhatsApp Bot"

### Step 2: Set Up WhatsApp Business Account

1. In the Meta App Dashboard, go to **WhatsApp → Getting Started**
2. Select or create a WhatsApp Business Account
3. Link a phone number (this becomes your chatbot number)
   - Use a dedicated business phone number
   - Verify the phone number via SMS/call
4. Note your **Phone Number ID** (you'll need this for `.env`)

### Step 3: Generate Access Token

1. Go to **Settings → Access Tokens** in your Meta App
2. Create a new access token with these permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_account_management`
   - `webhook_setup`
3. Copy the token and save it (needed for `.env`)

### Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the following in `.env`:
   ```env
   WHATSAPP_PHONE_NUMBER_ID=your_phone_id_from_meta_app
   WHATSAPP_ACCESS_TOKEN=your_access_token
   WHATSAPP_VERIFY_TOKEN=choose_a_secure_random_string
   ```

   Example:
   ```env
   WHATSAPP_PHONE_NUMBER_ID=120355637123456
   WHATSAPP_ACCESS_TOKEN=EAABsbCS1iHgBAFZCx...
   WHATSAPP_VERIFY_TOKEN=kopargaon_secure_token_2024
   ```

### Step 5: Set Up Webhook

1. **Get your server URL** - Your public server must be HTTPS accessible
   - Local development: Use ngrok to tunnel
     ```bash
     ngrok http 3000
     ```
   - Production: Your actual domain (e.g., kopargaon-priority.example.com)

2. **Configure Webhook in Meta App**:
   - Go to **WhatsApp → Configuration**
   - Click **Edit** on Webhooks
   - Set **Callback URL**: `https://your-domain.com/api/whatsapp/webhook`
   - Set **Verify Token**: (same as `WHATSAPP_VERIFY_TOKEN` in `.env`)
   - Click **Verify and Save**

3. **Subscribe to Webhook Events**:
   - After verification, set up webhook events
   - Subscribe to: `messages`, `message_status`

### Step 6: Install Dependencies

```bash
npm install
```

The project now includes `axios` for WhatsApp API calls.

### Step 7: Run Development Server

```bash
npm run dev
```

Server starts on `http://localhost:3000`

### Step 8: Test the Chatbot

#### Local Testing with ngrok:
```bash
# Terminal 1: Start dev server
npm run dev

# Terminal 2: Expose with ngrok
ngrok http 3000
```

Then in Meta App Webhook Configuration, use the ngrok URL:
```
https://abc123.ngrok.io/api/whatsapp/webhook
```

#### WhatsApp Testing:
1. Get the phone number of your WhatsApp Business Account
2. Message it from your personal WhatsApp
3. The chatbot will start the conversation

Sample conversation flow:
```
You: hi
Bot: नमस्ते! कोपरगाव नगर परिषद के नागरिक तक्रार प्रणाली में आपका स्वागत है।
     कृपया अपनी समस्या की श्रेणी चुनें:
     0 - 🛣️ Roads & Potholes
     1 - 💧 Water Supply
     ...

You: 0
Bot: ✅ आपने "🛣️ Roads & Potholes" चुना
     अब अपना वॉर्ड चुनें:
     0 - Ward 1 - Gandhi Market
     ...

[continues with ward selection, location, title, description, confirmation]

Bot: 🎉 धन्यवाद! आपकी तक्रार सफलतापूर्वक दर्ज की गई है।
     🎟️ टिकट संख्या: KPG-WA-123456
```

## API Endpoints

### Webhook Endpoints

**GET /api/whatsapp/webhook**
- Used by WhatsApp to verify your webhook during setup
- Returns challenge token if verified

**POST /api/whatsapp/webhook**
- Receives incoming WhatsApp messages
- Processes through chatbot conversation manager
- Handles button/list responses

### Complaint Management

**GET /api/complaints/whatsapp/:ticketNumber**
- Retrieve status of a WhatsApp complaint
- Response:
  ```json
  {
    "ticketNumber": "KPG-WA-123456",
    "phoneNumber": "+919876543210",
    "category": "Roads & Potholes",
    "status": "submitted",
    "createdAt": "2024-01-15T10:30:00Z"
  }
  ```

**POST /api/complaints/whatsapp**
- Create complaint programmatically (optional)
- Request body:
  ```json
  {
    "phoneNumber": "+919876543210",
    "title": "Big pothole on Main Road",
    "description": "Large pothole causing traffic issues",
    "category": "Roads & Potholes",
    "ward": "Ward 1 - Gandhi Market",
    "landmark": "Near Shivaji Chowk",
    "contactName": "Raj Kumar"
  }
  ```

## File Structure

```
src/services/
├── whatsappService.ts      # Chatbot logic & WhatsApp API calls
├── complaintStorage.ts     # Store complaints to JSON/Database
└── issueVerification.ts    # Existing AI verification

data/
└── whatsapp_complaints.json # Complaints database (auto-created)

server.ts                   # Updated with WhatsApp webhooks
```

## Conversation Flow

```
START
  ↓
Select Category (0-5)
  ↓
Select Ward (0-8)
  ↓
Enter Landmark/Location
  ↓
Enter Issue Title
  ↓
Enter Issue Description
  ↓
Enter Contact Name
  ↓
Confirm Details
  ↓
Create Ticket & Send Confirmation
  ↓
END
```

## Troubleshooting

### Webhook Not Verifying
- ✅ Check `WHATSAPP_VERIFY_TOKEN` matches in Meta Dashboard
- ✅ Ensure server is publicly accessible (HTTPS)
- ✅ Check server logs for verification request

### Messages Not Being Received
- ✅ Verify webhook subscription includes "messages"
- ✅ Check phone number is registered in Meta
- ✅ Confirm access token has correct permissions
- ✅ Check server logs for webhook POST requests

### Conversation State Issues
- Currently stored in-memory (loses on server restart)
- For production, implement persistent database (MongoDB, PostgreSQL, etc.)

### WhatsApp API Rate Limits
- Default: 80 API calls per second per access token
- Monitor and implement queue if needed

## Database Integration (Optional but Recommended)

For production, replace in-memory storage with a database:

```typescript
// Example: MongoDB integration
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db('kopargaon');
const complaints = db.collection('whatsapp_complaints');

// Store complaint
await complaints.insertOne(complaint);
```

## Security Considerations

1. **Access Token**: Keep `WHATSAPP_ACCESS_TOKEN` secure
   - Use environment variables
   - Never commit to version control
   - Rotate regularly

2. **Verify Webhook**: Always verify incoming webhooks
   - Check X-Hub-Signature header
   - Verify VERIFY_TOKEN on GET requests

3. **Rate Limiting**: Implement rate limits for API calls

4. **Data Privacy**: Ensure GDPR/local compliance
   - Store minimal personal data
   - Implement data deletion policies

## Production Deployment

### Using Cloud Run (Recommended):
```bash
# Build
npm run build

# Deploy to Cloud Run
gcloud run deploy kopargaon-priority \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars WHATSAPP_ACCESS_TOKEN=xxx,WHATSAPP_PHONE_NUMBER_ID=yyy
```

### Using Docker:
```dockerfile
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.cjs"]
```

## Supporting Multiple Languages

The current implementation includes Marathi messages. To add more languages:

1. Create language files:
   ```typescript
   // src/i18n/whatsapp.ts
   export const messages = {
     marathi: { /* existing */ },
     english: { /* new */ },
     hindi: { /* new */ }
   };
   ```

2. Update chatbot to detect language and respond accordingly

## Next Steps

1. ✅ Verify webhook configuration
2. ✅ Test with actual messages
3. ✅ Monitor conversation logs
4. ✅ Set up database for complaints
5. ✅ Add AI verification for WhatsApp complaints
6. ✅ Create tracking page for ticket numbers
7. ✅ Set up SMS/WhatsApp notifications for status updates

## Support & References

- [Meta WhatsApp Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [WhatsApp Business API Reference](https://developers.facebook.com/docs/whatsapp/api/messages/)
- [Webhook Events Documentation](https://developers.facebook.com/docs/whatsapp/webhooks/events)
- [ngrok Documentation](https://ngrok.com/docs) (for local testing)

## License & Contact

For issues or questions about the integration, contact the development team.

---

**Last Updated**: August 2024  
**Version**: 1.0
