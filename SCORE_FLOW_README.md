# GameKeeper Score Submission & Confirmation Flow

## 🎯 Implementation Summary

This implementation adds a complete score submission and confirmation workflow to the GameKeeper application with automatic time-based approvals and session management.

## 📋 Features Implemented

### 1. Score Submission API
**Endpoint:** `POST /api/session/:id/submit-score`

- ✅ Authenticated users can submit scores in JSON format
- ✅ Creates Result entry with `status = "PENDING"`
- ✅ Prevents duplicate submissions
- ✅ Only participants can submit scores
- ✅ Validates session is active

### 2. Score Confirmation API
**Endpoint:** `POST /api/session/:id/confirm-score`

- ✅ Review pending results (approve/reject)
- ✅ Updates `approvedById` and `status`
- ✅ Prevents self-confirmation
- ✅ Only participants can confirm scores

### 3. Time-Based Auto-Logic
**Implemented in session retrieval:**

- ✅ **Auto-approval:** Results pending >24 hours → `APPROVED`
- ✅ **Auto-void:** Sessions without results >24 hours → `VOID`
- ✅ Real-time status checks during API calls
- ✅ Time elapsed tracking and display

### 4. Enhanced Session Page UI
**Updated `/session/[id]` page with:**

- ✅ **Score Submission Form:**
  - Winner selection dropdown
  - Individual player scores
  - Optional notes field
  - Form validation

- ✅ **Approval/Rejection Interface:**
  - Pending score notifications
  - Approve/Reject buttons for other participants
  - Prevention of self-approval

- ✅ **Status Display:**
  - Color-coded status badges (PENDING, APPROVED, REJECTED, VOID)
  - Session age display
  - Result details with timestamps
  - Score data visualization

- ✅ **User Experience:**
  - Success/error toast messages
  - Loading states for all actions
  - Conditional UI based on user role and session state

## 🏗️ Database Schema

The implementation uses the existing Prisma schema with:

```prisma
model Result {
  id            String      @id @default(cuid())
  gameSession   GameSession @relation(fields: [gameSessionId], references: [id])
  gameSessionId String      @unique
  enteredById   String      // User who submitted the score
  approvedById  String?     // User who approved/rejected (optional)
  scoreData     Json        // Flexible score data structure
  status        String      // 'PENDING', 'APPROVED', 'REJECTED', 'VOID'
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt
}
```

## 🔄 Flow Diagram

```
1. User joins session → Participant
2. User submits score → Result (PENDING)
3. Other participants see approval request
4. Approval/Rejection → Result (APPROVED/REJECTED)
5. Auto-approval after 24h → Result (APPROVED)
6. No result after 24h → Session (VOID)
```

## 🧪 Testing Instructions

### 1. Setup Test Data
```bash
npm run db:seed  # Creates users: alice, bob (password: password123)
```

### 2. Test Score Submission Flow

1. **Login as alice** (`alice@example.com` / `password123`)
2. **Create a new session** (select any game)
3. **Share session code** with another user or login as bob
4. **Join session as bob** using the session code
5. **Submit score as alice:**
   - Click "Submit Score"
   - Select winner
   - Enter scores for each participant
   - Add optional notes
   - Submit

6. **View pending approval as bob:**
   - See yellow notification for pending score
   - Review score details
   - Approve or reject the score

### 3. Test Time-Based Logic

**To test auto-approval (simulated):**
- Modify the time check in the API to use minutes instead of hours
- Submit a score and wait for auto-approval

**To test auto-void:**
- Create a session and wait 24+ hours without submitting scores
- Session will automatically be marked as VOID

### 4. Test Edge Cases

- ✅ **Duplicate submission prevention**
- ✅ **Self-approval prevention**
- ✅ **Non-participant access control**
- ✅ **Inactive session handling**
- ✅ **Invalid score data handling**

## 📡 API Examples

### Submit Score
```bash
curl -X POST http://localhost:3000/api/session/SESSION_ID/submit-score \
  -H "Content-Type: application/json" \
  -d '{
    "scoreData": {
      "winner": "user_id",
      "scores": {
        "user1_id": 100,
        "user2_id": 85
      },
      "notes": "Great game!"
    }
  }'
```

### Confirm Score
```bash
curl -X POST http://localhost:3000/api/session/SESSION_ID/confirm-score \
  -H "Content-Type: application/json" \
  -d '{"action": "approve"}'
```

## 🎨 UI Components

### Status Badges
- 🟡 **PENDING** - Yellow badge, awaiting confirmation
- 🟢 **APPROVED** - Green badge, score confirmed
- 🔴 **REJECTED** - Red badge, score denied  
- ⚫ **VOID** - Gray badge, session expired
- 🔵 **ACTIVE** - Blue badge, session ongoing

### Score Form
- Participant dropdown for winner selection
- Number inputs for individual scores
- Textarea for optional notes
- Validation and error handling

### Approval Interface
- Clear pending notification
- Approve/Reject buttons with confirmation
- Disabled state during processing

## ⚡ Performance Considerations

- ✅ **Optimistic Updates:** UI updates immediately on user actions
- ✅ **Batch Operations:** Multiple time checks in single API call
- ✅ **Conditional Rendering:** UI elements only show when relevant
- ✅ **Loading States:** Clear feedback during async operations

## 🔐 Security Features

- ✅ **Authentication Required:** All endpoints require valid session
- ✅ **Participant Validation:** Only session participants can act
- ✅ **Self-Action Prevention:** Users can't approve their own scores
- ✅ **Input Validation:** Server-side validation for all inputs
- ✅ **SQL Injection Protection:** Prisma ORM with parameterized queries

## 🚀 Ready for Production

The implementation includes:
- Comprehensive error handling
- Type safety with TypeScript
- Responsive design with Tailwind CSS
- Real-time status updates
- Automated workflows
- Secure authentication flows

Start the application with `npm run dev` and test the complete score submission and confirmation workflow! 