import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.models import Base, Ride, PendingAction, ActionLog
from backend.app.agent.approval_gate import queue_pending_action, approve_action, reject_action

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    db = TestingSession()
    
    ride = Ride(title="Test Mysore Ride", destination="Mysore")
    db.add(ride)
    db.commit()
    db.refresh(ride)
    
    yield db, ride
    db.close()

def test_approval_gate_blocks_write_action(test_db):
    db, ride = test_db
    
    # 1. Queue a mutation action
    pending = queue_pending_action(
        db=db,
        ride_id=ride.id,
        action_type="SAVE_PLAN",
        description="Lock stops to database",
        tool_name="ride_plan.save_plan",
        payload={"timeline": [{"name": "Maddur Tiffany's", "type": "food"}]}
    )
    
    # Must be pending, NOT automatically executed
    assert pending.status == "PENDING"
    assert ride.status != "APPROVED"
    
    # Action log must show BLOCKED_FOR_APPROVAL
    log = db.query(ActionLog).filter(ActionLog.ride_id == ride.id).first()
    assert log is not None
    assert log.status == "BLOCKED_FOR_APPROVAL"
    
    # 2. Captain approves the action
    approval_result = approve_action(db, pending.id)
    assert approval_result["status"] == "success"
    
    # Verify execution happened
    updated_action = db.query(PendingAction).filter(PendingAction.id == pending.id).first()
    assert updated_action.status == "APPROVED"
    assert ride.status == "APPROVED"
    assert len(ride.stops) == 1
    assert ride.stops[0].name == "Maddur Tiffany's"

def test_approval_gate_rejection(test_db):
    db, ride = test_db
    
    pending = queue_pending_action(
        db=db,
        ride_id=ride.id,
        action_type="GROUP_SUMMARY",
        description="Post summary to WhatsApp",
        tool_name="group_comms.post_group_summary",
        payload={"ride_id": ride.id}
    )
    
    # Captain rejects
    reject_res = reject_action(db, pending.id)
    assert reject_res["status"] == "success"
    
    updated_action = db.query(PendingAction).filter(PendingAction.id == pending.id).first()
    assert updated_action.status == "REJECTED"
    
    # Check rejection audit log
    logs = db.query(ActionLog).filter(ActionLog.status == "REJECTED").all()
    assert len(logs) == 1
