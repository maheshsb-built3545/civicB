# WhatsApp Integration - Architecture & Implementation Summary

## What Was Implemented

A complete WhatsApp Business chatbot integration that allows citizens to file civic complaints through WhatsApp. The system is fully integrated with the existing Kopargaon Civic Decision Platform.

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Citizen (WhatsApp User)                     │
│                      +919876543210                               │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ "Hi, I have a pothole issue"
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              WhatsApp Business Cloud API (Meta)                  │
│           (Managed by Meta/Facebook Infrastructure)              │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ POST to Webhook
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│            Your Server (Node.js + Express)                      │
│  https://your-domain.com/api/whatsapp/webhook                   │
└────────────┬────────────────────────────────┬────────────────────┘
             │                                │
             ▼                                ▼
    ┌─────────────────┐          ┌──────────────────────┐
    │ Webhook Handler │          │ Verify Webhook       │
    │ (POST handler)  │          │ (GET handler)        │
    └────────┬────────┘          └──────────────────────┘
             │
             │ Extract phone & message
             ▼
    ┌─────────────────────────────────────────────┐
    │  whatsappService.ts                         │
    │  - Conversation State Manager               │
    │  - Message Handler                          │
    │  - Chatbot Logic                            │
    │                                             │
    │  Current State: 'category' → 'ward'         │
    │               → 'landmark' → 'title'        │
    │               → 'description' → 'contact'   │
    │               → 'confirm' → 'completed'     │
    └────────┬────────────────────────────────────┘
             │
             │ Send response messages
             ▼
    ┌──────────────────────────────────────────┐
    │ WhatsApp API Response Methods             │
    │ - sendWhatsAppMessage()                   │
    │ - sendWhatsAppButtons()                   │
    │ - sendWhatsAppList()                      │
    └────────┬─────────────────────────────────┘
             │
             │ POST responses via axios
             ▼
    ┌──────────────────────────────────────────┐
    │ WhatsApp Cloud API (Delivery)             │
    └────────┬─────────────────────────────────┘
             │
             │ Send to citizen's WhatsApp
             ▼
    ┌──────────────────────────────────────────┐
    │ Citizen receives message on WhatsApp      │
    │ "Please select your ward: 0-Ward 1..."   │
    └──────────────────────────────────────────┘

    ┌──────────────────────────────────────────┐  Meanwhile:
    │ complaintStorage.ts                      │
    │ - Stores conversation data               │
    │ - Creates complaint JSON                 │
    │ - Generates ticket number                │
    │ - Saved to: data/whatsapp_complaints.json│
    │                                          │
    │ Stored complaint includes:               │
    │ {                                        │
    │   ticketNumber: "KPG-WA-123456",        │
    │   phoneNumber: "+919876543210",         │
    │   category: "Roads & Potholes",         │
    │   status: "submitted",                  │
    │   createdAt: "2024-01-15T10:30:00Z"    │
    │ }                                        │
    └──────────────────────────────────────────┘
```

## Conversation Flow

```
START
  │
  ├─ Greeting Message
  │  "नमस्ते! कोपरगाव नगर परिषद के नागरिक तक्रार प्रणाली में आपका स्वागत है।"
  │
  ├─ Category Selection (6 options)
  │  0 - 🛣️ Roads & Potholes
  │  1 - 💧 Water Supply
  │  2 - 🚰 Drainage & Sewage
  │  3 - 💡 Streetlights & Electrical
  │  4 - 🗑️ Solid Waste Management
  │  5 - 🏗️ Public Safety & Structural
  │
  ├─ Ward Selection (9 wards)
  │  0 - Ward 1 - Gandhi Market
  │  1 - Ward 3 - Shivaji Chowk
  │  2 - Ward 4 - Betkopargaon
  │  ... etc
  │
  ├─ Landmark/Location Input
  │  "📍 समस्या का स्थान बताएं (जैसे: शिवाजी प्रतिमा के पास):"
  │  User: "Near Shivaji Chowk"
  │
  ├─ Issue Title
  │  "🏷️ समस्या का संक्षिप्त शीर्षक बताएं:"
  │  User: "Big pothole on Main Road"
  │
  ├─ Detailed Description
  │  "📝 समस्या का विवरण बताएं:"
  │  User: "There's a large pothole that damages vehicles..."
  │
  ├─ Contact Information
  │  "👤 अपना नाम बताएं (वैकल्पिक):"
  │  User: "Raj Kumar"
  │
  ├─ Confirmation
  │  "क्या यह सही है? (हाँ/नहीं):"
  │  [Shows summary of all details]
  │
  └─ Completion
     "🎉 धन्यवाद! आपकी तक्रार सफलतापूर्वक दर्ज की गई है।"
     "🎟️ टिकट संख्या: KPG-WA-123456"
     "📱 आप इस संख्या से अपनी तक्रार ट्रैक कर सकते हैं।"
END
```

## New Files Created

### 1. **src/services/whatsappService.ts** (350+ lines)
- `sendWhatsAppMessage()` - Send text messages
- `sendWhatsAppButtons()` - Send button options
- `sendWhatsAppList()` - Send selection lists
- `handleUserMessage()` - Main message routing
- `ConversationState` - Track conversation progress
- Conversation state management (in-memory)
- Category and ward constants
- Complete Marathi UI strings

### 2. **src/services/complaintStorage.ts** (150+ lines)
- `createWhatsAppComplaint()` - Create new complaint
- `getComplaintByTicket()` - Retrieve complaint by ticket
- `getAllComplaints()` - List all complaints
- `updateComplaintStatus()` - Update complaint status
- `convertWhatsAppComplaintToCivicIssue()` - Convert to internal format
- JSON file-based storage
- Automatic data directory creation

### 3. **server.ts** (Updated)
Added three new endpoints:
- `GET /api/whatsapp/webhook` - Verification endpoint
- `POST /api/whatsapp/webhook` - Message receiving endpoint
- `GET /api/complaints/whatsapp/:ticketNumber` - Status tracking
- `POST /api/complaints/whatsapp` - Create complaint endpoint

### 4. **WHATSAPP_SETUP.md** (Comprehensive Guide)
- Complete setup instructions
- Meta/Facebook account configuration
- Environment variable setup
- Webhook configuration
- Testing instructions
- API endpoint documentation
- Production deployment guide
- Troubleshooting section

### 5. **WHATSAPP_TESTING.md** (Quick Start Guide)
- Quick local testing instructions
- ngrok setup for local webhooks
- API testing with curl examples
- Common issues and solutions
- Message flow testing guide

### 6. **.env.example** (Updated)
Added WhatsApp configuration section:
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_VERIFY_TOKEN

### 7. **package.json** (Updated)
Added dependency:
- `axios: ^1.6.0` - For HTTP requests to WhatsApp API

## Integration Points with Existing System

### 1. Uses Existing Types
```typescript
// From src/types.ts
import { CivicIssue, IssueCategory } from '../types';

// Maps WhatsApp categories to existing IssueCategory type
category: 'Roads & Potholes' | 'Water Supply' | ...
```

### 2. Complaint Structure
```typescript
// WhatsAppComplaint extends core CivicIssue fields
{
  id: string;
  ticketNumber: string;
  title: string;
  description: string;
  category: IssueCategory;  // ← From existing system
  ward: string;              // ← Matches existing wards
  status: 'submitted' | 'verified' | 'ranked' | ...
  aiVerification?: {
    isLikelyGenuine: boolean;
    confidenceLabel: 'high' | 'medium' | 'low';
  };
}
```

### 3. Can Use Existing Verification
```typescript
// Optional: Send to existing AI verification endpoint
const verification = await fetch('/api/verify-issue', {
  method: 'POST',
  body: JSON.stringify({
    title: complaint.title,
    description: complaint.description,
    category: complaint.category,
    ward: complaint.ward,
    landmark: complaint.landmark
  })
});
```

## Environment Configuration

Required `.env` variables:
```env
# Existing
GEMINI_API_KEY=your_key

# New - WhatsApp
WHATSAPP_PHONE_NUMBER_ID=your_phone_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=your_verify_token
```

## Storage

### Current: JSON File Storage
```
data/whatsapp_complaints.json
[
  {
    "id": "wa-1705316400000-abc123def",
    "ticketNumber": "KPG-WA-123456",
    "phoneNumber": "+919876543210",
    "category": "Roads & Potholes",
    "status": "submitted",
    "createdAt": "2024-01-15T10:30:00Z",
    ...
  }
]
```

### Recommended: Database (Production)
- MongoDB
- PostgreSQL
- Firebase Firestore
- AWS DynamoDB

## Security Measures

1. **Webhook Verification**
   - Verify token on GET request
   - Prevents unauthorized webhook calls

2. **Access Token Protection**
   - Stored in environment variables
   - Never exposed in code
   - Rotated regularly

3. **Rate Limiting** (To implement)
   - Limit messages per user
   - Prevent spam/abuse

4. **Data Validation** (To implement)
   - Input sanitization
   - Length limits
   - SQL injection prevention (when using DB)

## Performance Considerations

### Current Limitations
- In-memory conversation storage (cleared on restart)
- JSON file storage (not scalable for high volume)
- Synchronous file writes

### Production Recommendations
1. Move conversation state to Redis
2. Use database for persistent storage
3. Implement message queue (RabbitMQ, Kafka)
4. Add caching layer
5. Load balance multiple server instances

## Scalability Path

```
Phase 1: Current (Development)
├─ In-memory state
└─ JSON file storage

Phase 2: Single Server Optimization
├─ Redis for state
├─ PostgreSQL for storage
└─ Message queue

Phase 3: High Scale
├─ Distributed Redis cluster
├─ Database replication
├─ Load balanced servers
├─ Message queue cluster
└─ CDN for static files
```

## Testing the Integration

### Manual Testing
1. Start server: `npm run dev`
2. Expose with ngrok: `ngrok http 3000`
3. Configure webhook in Meta Dashboard
4. Message the WhatsApp Business number
5. Follow the chatbot conversation

### Automated Testing
```bash
# Test webhook verification
curl -X GET "http://localhost:3000/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test&hub.challenge=123"

# Test incoming message
curl -X POST http://localhost:3000/api/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account",...}'

# Retrieve complaint
curl http://localhost:3000/api/complaints/whatsapp/KPG-WA-123456
```

## Future Enhancements

1. **AI-Powered Responses**
   - Use Gemini to validate complaints
   - Auto-categorize issues
   - Generate intelligent responses

2. **Location Mapping**
   - Integration with Google Maps
   - GPS-based location detection
   - Ward auto-detection from coordinates

3. **Rich Media Support**
   - Accept photos/videos of issues
   - Store media attachments
   - Display in web interface

4. **Status Notifications**
   - Send WhatsApp updates when complaint status changes
   - Provide action timeline
   - Request feedback

5. **Analytics Dashboard**
   - Track complaints by category
   - Response time metrics
   - User satisfaction scores

6. **Multi-Language Support**
   - English
   - Hindi
   - Marathi (current)
   - Auto-detect user language

7. **Integration with Existing Web UI**
   - Show WhatsApp complaints in main dashboard
   - Unified complaint list
   - Same ranking/priority system

## Deployment Checklist

- [ ] All environment variables configured
- [ ] Webhook URL verified in Meta Dashboard
- [ ] Database setup (if moving beyond JSON)
- [ ] Rate limiting implemented
- [ ] Error logging configured
- [ ] Backup strategy for complaints
- [ ] User support documentation ready
- [ ] Monitoring and alerts set up
- [ ] SSL certificate valid and renewed
- [ ] Load testing completed
- [ ] Security audit passed

## Support Resources

- [Meta WhatsApp Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api/)
- [WhatsApp Webhook Events](https://developers.facebook.com/docs/whatsapp/webhooks/events)
- [Project Documentation](./WHATSAPP_SETUP.md)
- [Testing Guide](./WHATSAPP_TESTING.md)

---

**Integration Complete!** ✅

The WhatsApp chatbot is now ready for configuration and testing. Follow the setup guide in `WHATSAPP_SETUP.md` to connect with Meta's WhatsApp Business API.
