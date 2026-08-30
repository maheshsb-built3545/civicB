# WhatsApp Integration - Feature Summary

## 📱 Citizens Can Now File Complaints via WhatsApp Chatbot

The Kopargaon Civic Decision Platform now includes a fully functional WhatsApp chatbot that enables citizens to submit civic complaints directly through WhatsApp messages.

### ✨ Key Features

- **🤖 Guided Conversation Flow**: Step-by-step chatbot guides users through complaint filing
- **🗺️ Ward Selection**: Citizens choose from 9 wards in Kopargaon
- **📂 Category Support**: 6 complaint categories (Roads, Water, Drainage, Streetlights, Waste, Safety)
- **🎟️ Instant Ticket Generation**: Unique ticket number issued immediately
- **📱 Native WhatsApp UI**: Uses WhatsApp's interactive buttons and lists
- **🇮🇳 Marathi Language**: Full conversation in Marathi with Devanagari script
- **💾 Complaint Tracking**: Citizens can track complaint status via ticket number
- **🔐 Secure**: Webhook verification with Meta's WhatsApp Business API

### 🚀 Quick Start

1. **Setup WhatsApp Business Account**
   - See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) for complete instructions

2. **Configure Environment**
   ```bash
   cp .env.example .env
   # Update with your WhatsApp credentials
   ```

3. **Install & Run**
   ```bash
   npm install
   npm run dev
   ```

4. **Test Locally**
   ```bash
   # Terminal 1
   npm run dev
   
   # Terminal 2
   ngrok http 3000
   ```

5. **Message the Bot**
   - Send any message to your WhatsApp Business number
   - Follow the guided conversation
   - Receive ticket number on completion

### 📋 Conversation Flow

```
User: "Hi"
↓
Bot: "नमस्ते! कोपरगाव नगर परिषद..."
    [6 complaint categories]
↓
User: "0" (select Roads & Potholes)
↓
Bot: "✅ आपने चुना... अब वॉर्ड चुनें"
    [9 wards available]
↓
User: "1" (select Ward)
↓
Bot: "📍 समस्या का स्थान बताएं"
User: "Near Shivaji Chowk"
↓
Bot: "🏷️ समस्या का शीर्षक"
User: "Big pothole"
↓
Bot: "📝 विस्तार से बताएं"
User: "Large pothole damaging vehicles..."
↓
Bot: "👤 आपका नाम"
User: "Raj Kumar"
↓
Bot: "क्या सही है?" [Summary]
User: "yes"
↓
Bot: "🎉 धन्यवाद! 🎟️ टिकट: KPG-WA-123456"
```

### 📚 Documentation

| Document | Purpose |
|----------|---------|
| [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) | Complete setup and configuration guide |
| [WHATSAPP_TESTING.md](./WHATSAPP_TESTING.md) | Quick start and testing guide |
| [WHATSAPP_ARCHITECTURE.md](./WHATSAPP_ARCHITECTURE.md) | System architecture and implementation details |

### 🔌 API Endpoints

```
GET  /api/whatsapp/webhook
     └─ Webhook verification endpoint

POST /api/whatsapp/webhook
     └─ Receive incoming WhatsApp messages

GET  /api/complaints/whatsapp/:ticketNumber
     └─ Track complaint status

POST /api/complaints/whatsapp
     └─ Create complaint programmatically
```

### 📂 New Files

```
src/services/
├── whatsappService.ts       # Chatbot logic & API integration
├── complaintStorage.ts      # Complaint persistence
└── [existing services]

data/
└── whatsapp_complaints.json  # Stored complaints (auto-created)

Documentation:
├── WHATSAPP_SETUP.md         # Full setup guide
├── WHATSAPP_TESTING.md       # Testing guide
├── WHATSAPP_ARCHITECTURE.md  # Architecture details
└── WHATSAPP_INTEGRATION.md   # This file
```

### 🔧 Configuration

Add to `.env`:

```env
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

### 📊 Stored Data Format

Complaints are stored as JSON:

```json
{
  "id": "wa-1705316400000-abc123def",
  "ticketNumber": "KPG-WA-123456",
  "phoneNumber": "+919876543210",
  "source": "whatsapp",
  "title": "Big pothole on Main Road",
  "description": "Large pothole at Shivaji Chowk...",
  "category": "Roads & Potholes",
  "ward": "Ward 3 - Shivaji Chowk & Main Market",
  "landmark": "Near Shivaji Chowk",
  "contactName": "Raj Kumar",
  "contactPhone": "+919876543210",
  "createdAt": "2024-01-15T10:30:00Z",
  "status": "submitted",
  "aiVerificationPending": true
}
```

### 🔒 Security

- ✅ Webhook verification with Meta
- ✅ Access tokens in environment variables
- ✅ HTTPS required for production
- ✅ Phone number validation
- ✅ Rate limiting (recommended)

### 🌐 Production Deployment

For production use:

1. Deploy to cloud (Cloud Run, AWS, Heroku, etc.)
2. Set up HTTPS with valid SSL certificate
3. Configure persistent database (MongoDB, PostgreSQL)
4. Set up monitoring and logging
5. Implement rate limiting
6. Enable webhook event subscription

See [WHATSAPP_SETUP.md](./WHATSAPP_SETUP.md) for production checklist.

### 📈 Next Steps

- ✅ Configure WhatsApp Business API credentials
- ✅ Test with ngrok locally
- ✅ Deploy to production server
- ✅ Integrate with AI verification (Gemini)
- ✅ Add location-based ward detection
- ✅ Support image attachments
- ✅ Add status update notifications
- ✅ Build unified complaint dashboard

### 🆘 Troubleshooting

**Webhook not verifying?**
- Check verify token matches in Meta Dashboard
- Ensure server is publicly accessible (HTTPS)
- Check server logs

**Messages not being received?**
- Verify webhook subscription includes "messages"
- Confirm phone number is registered
- Check access token permissions
- Review server logs

See [WHATSAPP_TESTING.md](./WHATSAPP_TESTING.md) for more troubleshooting.

### 📞 Support

For issues or questions:
1. Check the troubleshooting guides
2. Review server logs
3. Consult [Meta WhatsApp Docs](https://developers.facebook.com/docs/whatsapp/cloud-api/)
4. Contact the development team

---

**WhatsApp integration is ready!** 🎉 Follow the setup guide to get started.
