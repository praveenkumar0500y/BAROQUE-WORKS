.PHONY: help install test backend frontend demo clean

help:
	@echo "Ride Captain's Copilot Commands:"
	@echo "  make install   - Install Python and Node.js dependencies"
	@echo "  make test      - Run unit test suite (pytest)"
	@echo "  make backend   - Start FastAPI backend server (port 8000)"
	@echo "  make frontend  - Start React Vite frontend (port 5173)"
	@echo "  make demo      - Run full stack in Demo Mode (0 keys needed)"

install:
	pip install -r requirements.txt
	cd frontend && npm install

test:
	python -m pytest backend/tests -v

backend:
	python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	cd frontend && npm run dev

demo:
	python run_demo.py

clean:
	rm -rf .pytest_cache frontend/dist ride_copilot.db
