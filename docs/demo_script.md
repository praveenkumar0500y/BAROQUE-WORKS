# 3-Minute Hackathon Demo Script: Ride Captain's Copilot

## Elevator Pitch (15 seconds)
> "Organizing a group ride means digging through 40+ chaotic WhatsApp messages, guessing tank ranges, and arguing over food stops. **Ride Captain's Copilot** is an MCP-powered agent that turns messy group chats into an approved, safe, fuel-planned, and cost-split ride — with the Ride Captain always firmly in control."

---

## Step-by-Step Demo Flow (180 Seconds)

### 00:00 - 00:30 | The Problem & One-Click Ingestion (Screen 1: Home)
1. **Show Screen 1 (New Ride)**: Point to the clean dark cockpit UI.
2. Click **"Load 45-Msg Sample Chat"**:
   - Show the realistic Bangalore to Sakleshpur chat: banter, dropouts (Suresh's in-laws), bike model debates (Rahul's Interceptor 650), Thatte Idli requests, UPI IDs.
3. Highlight: **"Demo Mode is enabled"** — 100% offline, deterministic mock LLM, zero external API keys needed.
4. Click **"Parse & Run Ride Copilot"**.
   - Watch the agent run in ~1.5 seconds.

### 00:30 - 01:00 | Intelligent Rider Roster & Bike Bottlenecks (Screen 2: Parsed)
1. View the extracted roster:
   - Notice Suresh is correctly marked **"Declined"** and Manisha as **"Undecided"**.
   - Notice Rahul's **Royal Enfield Interceptor 650** was matched in the Indian Motorcycle database with 13.7L tank and 22 km/l mileage.
2. Show the **Group Bottleneck Banner**:
   - The Copilot flagged Rahul's 301.4 km range as the group constraint, setting the safe refuel leg cap at **241.1 km ($0.8\times$)**.

### 01:00 - 01:30 | Route, Stops & Weather Safety (Screen 3: Plan)
1. Show the **Leaflet Interactive Route Map**:
   - Route from Nelamangala Toll to Sakleshpur along NH75.
   - Colored custom markers:
     - 🍔 **Food**: Swathi Delicacy (Kunigal, 75 km, 7:15 am, Thatte Idli pure veg).
     - 🚻 **Restroom**: Comfort stop at Channarayapatna ensuring no gap exceeds 47 km.
     - ⛽ **Fuel Refuel**: Indian Oil Mega COCO Hassan Bypass (182.4 km) before climbing into the ghats.
2. Show the **Open-Meteo Weather Verdict**:
   - Large **"GO"** badge (15% rain probability, safe crosswinds).

### 01:30 - 02:15 | The Core Story: The Captain's Approval Gate (Screen 4: Approvals)
1. Switch to **Tab 4 (Approvals)**:
   - Highlight the green **"Controlled by You"** badge.
   - Explain: *"Notice that the agent did NOT blindly commit the plan or spam WhatsApp. It queued 3 pending actions: Save Plan, Calendar Export, and Group Announcement."*
2. Click **"Approve & Execute"** on **Calendar Export**:
   - Instantly unlocks the **Download .ics Calendar File** button.
3. Click **"Approve & Execute"** on **Group Summary**:
   - Shows the formatted WhatsApp message ready to copy with full safety rules and timeline.
4. Switch to **Tab 5 (Action Log)**:
   - Show the immutable audit trail displaying every tool invocation and human approval timestamp.

### 02:15 - 02:45 | Expense Ledger & UPI Deep Links (Screen 6: Expenses)
1. Switch to **Tab 6 (Expenses & UPI)**:
   - Show the recorded bills (Swathi Delicacy breakfast, highway toll).
   - Explain the **Net Debt Minimization Algorithm**: reduces complex pairwise debts into just 2-3 optimal settlements.
   - Point to the **"Pay via UPI"** buttons (`upi://pay?pa=...&am=...&cu=INR&tn=Ride_Settlement`).

### 02:45 - 03:00 | Hands-Free Ride Mode (Screen 7: Cockpit)
1. Switch to **Tab 7 (Ride Mode)**:
   - High-contrast cockpit UI for phone bike-mounts.
2. Switch Language to **Hindi** or **Kannada** and click **"Brief Me"**:
   - Listen to the audio briefing generated via ElevenLabs / browser speech synthesis.
3. Click **"Simulate Spoken Alert"**:
   - Audio warning for approaching fuel stop.
4. Tap the microphone and say **"How far is the next fuel stop?"** or click the quick query chip:
   - Copilot speaks back the exact distance to Hassan Indian Oil COCO!

---

## Key Talking Points for Judges
- **Track Relevance:** "Make MCP Matter" — MCP isn't just an abstract protocol; here, 6 discrete MCP servers coordinate real-world APIs (Overpass, Open-Meteo, iCalendar, UPI) to solve a chaotic real-world friction point.
- **Safety First:** Group motorcycle riding is dangerous if someone runs out of fuel in remote ghats. The $0.8\times$ algorithm and weather verdict solve this.
- **Human-in-the-Loop:** Strict separation between Read tools (autonomous) and Write actions (gated by Captain).
