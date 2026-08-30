# WhatsApp Integration - Quick Start Testing Guide

## Quick Start for Local Development

### Prerequisites
- Node.js 18+
- npm installed
- A Meta/Facebook account
- ngrok for local testing (optional but recommended)

### 1. Install Dependencies

```bash
cd kopargaonpriority-civic-decision-platform
npm install
```

This will install axios and other required packages for WhatsApp integration.

### 2. Configure Environment

Create or update `.env` file:

```env
GEMINI_API_KEY=your_gemini_key_if_available
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAABsbCS1iHgBAHello...
WHATSAPP_VERIFY_TOKEN=my_secure_token_123
```

### 3. Run the Server

```bash
npm run dev
```

Output should show:
```
Kopargaon Civic Platform Server running on port 3000
```

### 4. Testing Locally with ngrok

In a new terminal:

```bash
ngrok http 3000
```

You'll get a public URL like: `https://abc123.ngrok.io`

### 5. Configure Webhook in Meta Dashboard

1. Go to [Meta Developers Console](https://developers.facebook.com)
2. Select your WhatsApp app
3. Go to **WhatsApp → Configuration**
4. Set Callback URL: `https://abc123.ngrok.io/api/whatsapp/webhook`
5. Set Verify Token: `my_secure_token_123`
6. Click **Verify and Save**

### 6. Send Test Messages

From your phone, message the WhatsApp Business number and type:
- `hi` or `hello` - Start the conversation

### 7. Monitor Logs

Watch the terminal where you ran `npm run dev` for message logs:

```
📱 WhatsApp Message from +919876543210: hi
```

## Webhook Response Codes

- ✅ **200** - Webhook successfully verified or message processed
- ❌ **403** - Webhook verification token mismatch
- ❌ **500** - Server error (check logs)

## API Testing with curl

### Test Webhook Verification

```bash
curl -X GET "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=my_secure_token_123&hub.challenge=test123"
```

Expected response: `test123`

### Simulate Incoming Message

```bash
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "field": "messages",
        "value": {
          "messages": [{
            "from": "919876543210",
            "type": "text",
            "text": {"body": "0"}
          }],
          "contacts": [{"profile": {"name": "Test User"}}]
        }
      }]
    }]
  }'
```

### Get Complaint Status

```bash
curl http://localhost:3000/api/complaints/whatsapp/KPG-WA-123456
```

## Common Issues & Solutions

### Issue: Webhook not verifying

**Solution:**
```bash
# Check your WHATSAPP_VERIFY_TOKEN in .env matches Meta Dashboard
echo $WHATSAPP_VERIFY_TOKEN
```

### Issue: Cannot connect to WhatsApp API

**Solution:**
- Verify `WHATSAPP_ACCESS_TOKEN` is correct
- Check token has required permissions
- Ensure phone number ID is correct format (numeric only)

### Issue: Messages not appearing

**Solution:**
1. Check ngrok is running: `ngrok http 3000`
2. Verify callback URL in Meta Dashboard uses ngrok URL
3. Check server logs for errors
4. Ensure phone number is registered in WhatsApp Business Account

### Issue: Complaints not saving

**Solution:**
- Check `data/` directory exists
- Verify server has write permissions
- Check disk space available

## File Locations

After testing, you'll see:
- Complaints saved in: `data/whatsapp_complaints.json`
- Server logs in terminal
- Conversation states stored in memory (cleared on restart)

## Message Flow Testing

1. **Send**: "hi"
   - Bot responds with category selection menu

2. **Send**: "0" (select Roads & Potholes)
   - Bot confirms and asks for ward selection

3. **Send**: "1" (select Ward)
   - Bot asks for landmark

4. **Send**: "Near Shivaji Chowk"
   - Bot asks for issue title

5. **Send**: "Big pothole"
   - Bot asks for description

6. **Send**: "There's a large pothole on Main Road"
   - Bot asks for contact name

7. **Send**: "Raj Kumar" (or just press enter)
   - Bot shows confirmation

8. **Send**: "yes"
   - Bot creates ticket and confirms

## Debugging

Enable detailed logs by adding to server.ts:

```typescript
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  next();
});
```

## Production Checklist

- [ ] Access token is secure and not in version control
- [ ] Webhook URL is HTTPS with valid certificate
- [ ] Rate limiting is implemented
- [ ] Database is set up for persistent storage
- [ ] Error monitoring is configured
- [ ] Complaints are being verified by AI
- [ ] User support channel is set up

## Next: Production Deployment

After testing locally:

1. Deploy server to production (Cloud Run, AWS, etc.)
2. Update Meta Dashboard webhook URL to production URL
3. Test with real users
4. Monitor error logs and complaints
5. Iterate based on feedback

---

For full setup details, see [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md)
