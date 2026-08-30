# WhatsApp Integration - Quick Reference Card

## 🎯 What You Can Do Now

Citizens can file civic complaints via WhatsApp chatbot by:
1. Messaging your WhatsApp Business number
2. Following an interactive guided conversation
3. Selecting issue category, ward, and providing details
4. Receiving a ticket number instantly

## 📋 What Was Added

### New Backend Files
- ✅ `src/services/whatsappService.ts` - Chatbot logic (360 lines)
- ✅ `src/services/complaintStorage.ts` - Complaint storage (150 lines)
- ✅ `server.ts` - Updated with WhatsApp endpoints

### New API Endpoints
- ✅ `GET /api/whatsapp/webhook` - Webhook verification
- ✅ `POST /api/whatsapp/webhook` - Receive messages
- ✅ `GET /api/complaints/whatsapp/:ticketNumber` - Track status
- ✅ `POST /api/complaints/whatsapp` - Create complaint

### Documentation Files
- ✅ `WHATSAPP_SETUP.md` - Complete setup guide (comprehensive)
- ✅ `WHATSAPP_TESTING.md` - Quick start for testing
- ✅ `WHATSAPP_ARCHITECTURE.md` - System architecture details
- ✅ `WHATSAPP_INTEGRATION.md` - Feature overview

### Configuration
- ✅ `.env.example` - Updated with WhatsApp vars
- ✅ `package.json` - Added axios dependency

## 🚀 Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Configure Environment
```bash
# Edit .env file with your WhatsApp credentials
WHATSAPP_PHONE_NUMBER_ID=123456789012345
WHATSAPP_ACCESS_TOKEN=EAABsbCS1iHgBAHello...
WHATSAPP_VERIFY_TOKEN=my_secure_token_123
```

### Step 3: Run & Test
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Expose to internet (for local testing)
ngrok http 3000
```

Then message your WhatsApp Business number!

## 📝 Conversation Example

```
User messages: "Hi"

Bot: 
🙏 नमस्ते! कोपरगाव नगर परिषद के नागरिक तक्रार प्रणाली में आपका स्वागत है।
👇 कृपया अपनी समस्या की श्रेणी चुनें:

0 - 🛣️ Roads & Potholes
1 - 💧 Water Supply
2 - 🚰 Drainage & Sewage
3 - 💡 Streetlights & Electrical
4 - 🗑️ Solid Waste Management
5 - 🏗️ Public Safety & Structural

User responds: "0"

Bot:
✅ आपने "🛣️ Roads & Potholes" चुना
👇 अब अपना वॉर्ड चुनें:

[continues with ward selection, location, title, description...]

Final:
🎉 धन्यवाद! आपकी तक्रार सफलतापूर्वक दर्ज की गई है।
🎟️ टिकट संख्या: KPG-WA-123456
```

## 🔑 Key Concepts

| Term | Meaning |
|------|---------|
| **Webhook** | URL where Meta sends incoming messages |
| **Verify Token** | Secret string to verify webhook authenticity |
| **Phone Number ID** | Unique ID of your WhatsApp Business number |
| **Access Token** | Authorization token for API requests |
| **Ticket Number** | Unique identifier for each complaint (KPG-WA-XXXXX) |
| **Conversation State** | Tracks where user is in the chatbot flow |

## 🔗 File Relationships

```
server.ts (Entry Point)
    ├─ Imports: whatsappService.ts
    │   └─ handleUserMessage()
    │   └─ sendWhatsAppMessage()
    │
    ├─ Imports: complaintStorage.ts
    │   └─ createWhatsAppComplaint()
    │   └─ getComplaintByTicket()
    │
    ├─ Endpoint: GET /api/whatsapp/webhook
    ├─ Endpoint: POST /api/whatsapp/webhook
    ├─ Endpoint: GET /api/complaints/whatsapp/:ticketNumber
    └─ Endpoint: POST /api/complaints/whatsapp

Data Storage:
    └─ data/whatsapp_complaints.json (auto-created)
```

## 🎛️ Configuration Checklist

- [ ] Meta Business Account created
- [ ] WhatsApp Business Account set up
- [ ] Phone number registered and verified
- [ ] Meta App created in Developers Console
- [ ] Access token generated with correct permissions
- [ ] WHATSAPP_PHONE_NUMBER_ID added to `.env`
- [ ] WHATSAPP_ACCESS_TOKEN added to `.env`
- [ ] WHATSAPP_VERIFY_TOKEN added to `.env`
- [ ] Server running (`npm run dev`)
- [ ] Webhook callback URL configured in Meta Dashboard
- [ ] Webhook verified successfully
- [ ] First test message sent

## 🧪 Testing Checklist

- [ ] Message bot from WhatsApp
- [ ] Select category (0-5)
- [ ] Select ward (0-8)
- [ ] Enter landmark
- [ ] Enter title
- [ ] Enter description
- [ ] Enter contact name
- [ ] Confirm details
- [ ] Receive ticket number
- [ ] Check `data/whatsapp_complaints.json` for stored complaint
- [ ] Retrieve complaint via: `GET /api/complaints/whatsapp/KPG-WA-XXXXX`

## 🌍 Deployment Checklist

- [ ] Server deployed to HTTPS URL
- [ ] SSL certificate valid
- [ ] Webhook URL updated to production domain
- [ ] Webhook re-verified in Meta Dashboard
- [ ] Database configured (MongoDB/PostgreSQL recommended)
- [ ] Environment variables set on production server
- [ ] Monitoring and logging configured
- [ ] Rate limiting implemented
- [ ] Error handling tested
- [ ] Load testing completed
- [ ] Production credentials secured
- [ ] Backup strategy in place

## 🐛 Common Errors & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| Webhook not verifying | Token mismatch | Check `WHATSAPP_VERIFY_TOKEN` in `.env` and Meta Dashboard match exactly |
| 403 Forbidden | Webhook verification failed | Verify token is correct; ensure server is HTTPS |
| Cannot send messages | Missing credentials | Check `WHATSAPP_PHONE_NUMBER_ID` and `WHATSAPP_ACCESS_TOKEN` |
| Messages not received | Webhook not subscribed | Verify webhook events subscription includes "messages" |
| Complaints not saved | Permission error | Check `data/` directory exists and writable |

## 📞 Support Resources

- **Setup Guide**: [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md)
- **Testing Guide**: [WHATSAPP_TESTING.md](./WHATSAPP_TESTING.md)
- **Architecture**: [WHATSAPP_ARCHITECTURE.md](./WHATSAPP_ARCHITECTURE.md)
- **Meta Docs**: https://developers.facebook.com/docs/whatsapp/cloud-api/
- **Webhook Events**: https://developers.facebook.com/docs/whatsapp/webhooks/events

## 💡 Tips & Tricks

1. **Use ngrok for local testing**
   ```bash
   ngrok http 3000
   # Use the ngrok URL in Meta Dashboard webhook config
   ```

2. **Monitor logs during testing**
   ```bash
   # Watch terminal where npm run dev is running
   # Look for: 📱 WhatsApp Message from +919876543210: hello
   ```

3. **Test API endpoints with curl**
   ```bash
   # Check complaint status
   curl http://localhost:3000/api/complaints/whatsapp/KPG-WA-123456
   ```

4. **Clear conversation state between tests**
   - Server restart clears in-memory conversation state
   - Use different phone numbers for multiple conversations

5. **Inspect stored complaints**
   ```bash
   cat data/whatsapp_complaints.json | python -m json.tool
   ```

## 🔄 Conversation State Transitions

```
START → CATEGORY → WARD → LANDMARK → TITLE → 
DESCRIPTION → CONTACT → CONFIRM → COMPLETED
```

Each step validates user input and guides them forward.

## 📊 Complaint Structure

```javascript
{
  id: "wa-1705316400000-abc123def",
  ticketNumber: "KPG-WA-123456",
  phoneNumber: "+919876543210",
  source: "whatsapp",
  title: "Issue title",
  description: "Detailed description",
  category: "Category name",
  ward: "Ward name",
  landmark: "Location landmark",
  contactName: "Citizen name",
  status: "submitted|verified|ranked|scheduled|in_progress|resolved",
  createdAt: "ISO timestamp",
  aiVerificationPending: true/false
}
```

## 🎯 Next Steps After Setup

1. ✅ Configure Meta/Facebook credentials
2. ✅ Test conversation flow with ngrok
3. ✅ Verify complaints are saved
4. ✅ Deploy to production server
5. ⏳ Integrate with AI verification (Gemini)
6. ⏳ Add location detection (GPS)
7. ⏳ Support media attachments (photos)
8. ⏳ Send status updates via WhatsApp
9. ⏳ Add analytics dashboard
10. ⏳ Support multiple languages

---

## 📖 Quick Links

| Document | Read Time | Purpose |
|----------|-----------|---------|
| This file | 5 min | Quick reference |
| WHATSAPP_SETUP.md | 15 min | Complete setup |
| WHATSAPP_TESTING.md | 10 min | Local testing |
| WHATSAPP_ARCHITECTURE.md | 10 min | Technical details |

**You're all set!** 🚀 Start with the setup guide when ready.
