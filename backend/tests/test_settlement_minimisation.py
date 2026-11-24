import pytest
from backend.mcp_servers.bill_split_server import compute_minimal_settlements

def test_settlement_balances_sum_to_zero_and_minimal():
    riders = [
        {"id": "r1", "name": "Rohan (Captain)", "upi_id": "rohan@okhdfc"},
        {"id": "r2", "name": "Vikram", "upi_id": "vikram@okaxis"},
        {"id": "r3", "name": "Ananya", "upi_id": "ananya@oksbi"},
        {"id": "r4", "name": "Rahul", "upi_id": "rahul@okhdfc"}
    ]
    
    # Rohan pays 4000 for breakfast & stay
    # Vikram pays 1200 for tea & snacks
    # Ananya pays 800 for toll & emergency buffer
    # Rahul pays 0
    expenses = [
        {"payer_id": "r1", "amount": 4000.0, "split_among": ["r1", "r2", "r3", "r4"]},
        {"payer_id": "r2", "amount": 1200.0, "split_among": ["r1", "r2", "r3", "r4"]},
        {"payer_id": "r3", "amount": 800.0, "split_among": ["r1", "r2", "r3", "r4"]},
    ]
    
    result = compute_minimal_settlements(riders, expenses)
    
    # 1. Balances must sum to 0 (within float rounding)
    balance_sum = sum(result["per_rider_balance"].values())
    assert abs(balance_sum) < 0.05, f"Balance sum was {balance_sum}, expected ~0"
    
    # 2. Number of settlement transactions must be <= N - 1 (<= 3 for 4 riders)
    settlements = result["settlements"]
    assert len(settlements) <= len(riders) - 1
    
    # 3. Each settlement must have positive amount and valid UPI link
    for s in settlements:
        assert s["amount"] > 0
        assert "upi://pay" in s["upi_link"]
        assert s["to_upi"] in ["rohan@okhdfc", "vikram@okaxis", "ananya@oksbi", "rahul@okhdfc"]
