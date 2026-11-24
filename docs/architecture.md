# Architecture: Ride Captain's Copilot

## High-Level System Architecture
```mermaid
flowchart TD
    %% Inputs
    subgraph Inputs [User & Group Inputs]
        WA[Exported WhatsApp Chat<br/>45+ Raw Messages]
        VoiceIn[Web Speech Voice Commands<br/>Ride Mode Hands-Free]
    end

    %% Agent Core
    subgraph AgentLayer [Orchestration Agent]
        LLM[LLM Interface<br/>Mock Provider / Gemini / Anthropic]
        Orch[Ride Captain Orchestrator]
    end

    %% MCP Ecosystem
    subgraph MCPServers [FastMCP Servers via Stdio / Client]
        CP[chat_parser_server<br/>• Entity Extraction<br/>• Bike Spec Matching]
        RP[ride_plan_server<br/>• SQLite Datastore<br/>• Rider & Bike Models]
        SF[stop_finder_server<br/>• 0.8x Safe Range Algo<br/>• Overpass Food & Restrooms]
        WE[weather_server<br/>• Open-Meteo Integration<br/>• GO/CAUTION/NO-GO Verdict]
        CA[calendar_server<br/>• .ics File Generator<br/>• Google Calendar Hook]
        BS[bill_split_server<br/>• Net Cashflow Minimization<br/>• UPI Deep Links upi://pay]
    end

    %% Approval Gate & Audit
    subgraph ControlledSafety [Captain's Approval Gate]
        Gate{Action Gatekeeper}
        ReadExec[Auto-Execute Read Tools<br/>• Query Weather<br/>• Geocode Route<br/>• Parse Chat]
        WritePending[Queue Mutation as PENDING<br/>• Save Plan<br/>• Export Calendar<br/>• Group WhatsApp Post<br/>• Debt Settlements]
        CaptainDecision[Ride Captain Approval<br/>UI Button or Voice 'Confirm']
        AuditLog[(Action Audit Log<br/>Immutable SQLite Record)]
    end

    %% Outputs & UI
    subgraph Delivery [Frontend Cockpit & Outputs]
        ReactUI[React + Vite + Leaflet UI]
        TTS[ElevenLabs / Browser TTS<br/>Spoken Briefings en/hi/kn]
        ICSDownload[Calendar .ics File]
        UPILinks[Instant UPI Payments]
    end

    WA --> Orch
    VoiceIn --> Orch
    Orch <--> LLM
    Orch <-->|Tool Execution| MCPServers

    MCPServers --> Gate
    Gate -->|Read Tool| ReadExec --> ReactUI
    Gate -->|Mutation Tool| WritePending --> CaptainDecision
    CaptainDecision -->|Approved| AuditLog --> Delivery
    CaptainDecision -->|Rejected| AuditLog
    AuditLog --> ReactUI
```

---

## Controlled by Design: The Approval Gate

In conventional agent workflows, agents often hallucinate or execute irreversible write actions autonomously. **Ride Captain's Copilot** solves this by establishing a strict architectural division:

1. **Autonomous Read Discovery (Zero Friction)**:
   - Extraction of chat messages (`chat_parser.parse_whatsapp_chat`)
   - Weather hazard analysis (`weather.get_route_weather`)
   - Route distance and stop proposals (`stop_finder.find_stops_and_route`)
   - Expense calculations (`bill_split.compute_settlement`)

2. **Mandatory Captain Authorization (High Stakes)**:
   - **`SAVE_PLAN`**: Committing stops and locking itineraries to the database.
   - **`CALENDAR_EXPORT`**: Generating group invites and scheduling files.
   - **`GROUP_SUMMARY`**: Broadcasting safety briefings to the WhatsApp chat.
   - **`SETTLEMENT_LINKS`**: Publishing binding financial transactions and debt transfers.

Every mutation is tagged as `PENDING` and presented with an explanatory payload in the UI and voice cockpit. The Ride Captain can confirm or reject via one click or by speaking **"Confirm"** / **"Cancel"**.

---

## Safe Fuel Stop Calculation Algorithm ($0.8 \times \min(Range)$)

Motorcycle group rides are inherently limited by the rider with the smallest fuel tank capacity.
$$\text{Safe Range} = 0.8 \times \min_{r \in \text{Confirmed}} (\text{Tank Litres}_r \times \text{Mileage}_r)$$

For the Bangalore to Sakleshpur route:
- Rahul's **Royal Enfield Interceptor 650** ($13.7\text{ L} \times 22\text{ kmpl} = 301.4\text{ km}$).
- $\text{Safe Range} = 0.8 \times 301.4 = \mathbf{241.1\text{ km}}$.
- The algorithm places a mandatory refuel at **Hassan Bypass (182.4 km)** to guarantee that all riders enter the Western Ghats twisties on full tanks with safety buffers.
- If a route segment exceeds the safe threshold without an available fuel station, the algorithm surfaces a **CRITICAL WARNING** to the Captain.

---

## Net Debt Minimization & UPI Payments

Given $N$ riders with expenses $E_k$, net balance is calculated:
$$B_i = \sum \text{Paid}_i - \sum \text{Share}_i \quad \text{where } \sum_{i=1}^N B_i = 0$$

A greedy matching algorithm repeatedly matches the maximum debtor with the maximum creditor, resolving all balances in at most $N - 1$ transactions. Each transaction generates a standardized Indian UPI deep link:
`upi://pay?pa={upi_id}&pn={name}&am={amount}&cu=INR&tn=Ride_Settlement`
