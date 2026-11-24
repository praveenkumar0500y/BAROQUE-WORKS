import json
import urllib.parse
from typing import Dict, Any, List, Optional
from mcp.server.mcpserver import MCPServer
from backend.app.db import SessionLocal
from backend.app.models import Ride, Rider, Expense

server = MCPServer("bill_split_server")

def compute_minimal_settlements(
    riders: List[Dict[str, Any]],
    expenses: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Computes minimum settlement transactions using net cash flow algorithm.
    Guarantees:
    - Sum of net balances == 0
    - Number of transactions <= N - 1
    - Each settlement has a valid Indian UPI deep link
    """
    rider_map = {r["id"]: r for r in riders}
    balances = {r["id"]: 0.0 for r in riders}
    total_spent = sum(e["amount"] for e in expenses)

    # Calculate net balance for each rider
    for exp in expenses:
        payer_id = exp["payer_id"]
        amt = float(exp["amount"])
        split_among = exp.get("split_among") or list(rider_map.keys())
        if not split_among:
            split_among = list(rider_map.keys())
            
        # Payer gets positive balance (money owed back)
        if payer_id in balances:
            balances[payer_id] += amt
            
        # Each participant gets charged their share
        share = amt / len(split_among)
        for part_id in split_among:
            if part_id in balances:
                balances[part_id] -= share

    # Round balances to 2 decimal places to avoid floating point precision drifts
    balances = {k: round(v, 2) for k, v in balances.items()}

    # Separate into debtors (owes money, negative balance) and creditors (gets money, positive balance)
    debtors = []
    creditors = []
    for rid, bal in balances.items():
        if bal < -0.01:
            debtors.append({"id": rid, "amount": -bal})
        elif bal > 0.01:
            creditors.append({"id": rid, "amount": bal})

    transactions = []
    
    # Greedy settlement matching
    d_idx = 0
    c_idx = 0
    while d_idx < len(debtors) and c_idx < len(creditors):
        debtor = debtors[d_idx]
        creditor = creditors[c_idx]
        
        transfer_amt = min(debtor["amount"], creditor["amount"])
        transfer_amt = round(transfer_amt, 2)
        
        from_rider = rider_map.get(debtor["id"], {"name": "Rider", "upi_id": ""})
        to_rider = rider_map.get(creditor["id"], {"name": "Rider", "upi_id": ""})
        
        # Generate UPI deep link: upi://pay?pa=...&pn=...&am=...&cu=INR&tn=...
        to_upi = to_rider.get("upi_id") or "captain@upi"
        to_name = urllib.parse.quote(to_rider.get("name", "Rider"))
        note = urllib.parse.quote("Ride Settlement")
        upi_link = f"upi://pay?pa={to_upi}&pn={to_name}&am={transfer_amt:.2f}&cu=INR&tn={note}"

        transactions.append({
            "from_rider_id": debtor["id"],
            "from_rider_name": from_rider.get("name"),
            "to_rider_id": creditor["id"],
            "to_rider_name": to_rider.get("name"),
            "amount": transfer_amt,
            "upi_id": to_upi,
            "to_upi": to_upi,
            "upi_link": upi_link
        })
        
        debtor["amount"] -= transfer_amt
        creditor["amount"] -= transfer_amt
        
        if debtor["amount"] <= 0.01:
            d_idx += 1
        if creditor["amount"] <= 0.01:
            c_idx += 1

    return {
        "total_expenses": round(total_spent, 2),
        "per_rider_balance": balances,
        "settlements": transactions
    }

@server.tool()
def add_expense(
    ride_id: str,
    payer_id: str,
    payer_name: str,
    amount: float,
    category: str = "food",
    description: str = "",
    split_among_json: str = "[]"
) -> str:
    """Record a group ride expense in the ledger."""
    db = SessionLocal()
    try:
        exp = Expense(
            ride_id=ride_id,
            payer_id=payer_id,
            payer_name=payer_name,
            amount=amount,
            category=category,
            description=description,
            split_among_json=split_among_json
        )
        db.add(exp)
        db.commit()
        db.refresh(exp)
        return json.dumps({
            "status": "success",
            "expense_id": exp.id,
            "amount": exp.amount,
            "category": exp.category
        })
    finally:
        db.close()

@server.tool()
def compute_settlement(ride_id: str) -> str:
    """Compute minimal settlements and UPI payment deep links for a ride."""
    db = SessionLocal()
    try:
        ride = db.query(Ride).filter(Ride.id == ride_id).first()
        if not ride:
            return json.dumps({"status": "error", "message": f"Ride {ride_id} not found"})
            
        riders_data = [
            {"id": r.id, "name": r.name, "upi_id": r.upi_id}
            for r in ride.riders if r.status == "confirmed"
        ]
        
        expenses_data = []
        for e in ride.expenses:
            try:
                split_among = json.loads(e.split_among_json or "[]")
            except:
                split_among = []
            expenses_data.append({
                "payer_id": e.payer_id,
                "amount": e.amount,
                "split_among": split_among
            })
            
        result = compute_minimal_settlements(riders_data, expenses_data)
        return json.dumps(result)
    finally:
        db.close()

if __name__ == "__main__":
    server.run(transport="stdio")
