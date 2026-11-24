import os
import sys
import subprocess
import time
import signal
import webbrowser

def main():
    print("==========================================================")
    print("🏍️  Starting Ride Captain's Copilot (Demo Mode)")
    print("    Track: Make MCP Matter")
    print("==========================================================")
    
    root_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(root_dir, "frontend")
    
    # Ensure .env exists
    if not os.path.exists(os.path.join(root_dir, ".env")):
        with open(os.path.join(root_dir, ".env.example"), "r") as src:
            with open(os.path.join(root_dir, ".env"), "w") as dst:
                dst.write(src.read())

    # Start FastAPI Backend
    print("[1/2] Launching FastAPI Backend on http://localhost:8000 ...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=root_dir)
    
    # Wait 2 seconds for backend to initialize
    time.sleep(2)
    
    # Start Vite Frontend
    print("[2/2] Launching React Vite Frontend on http://localhost:5173 ...")
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    frontend_cmd = [npm_cmd, "run", "dev"]
    frontend_proc = subprocess.Popen(frontend_cmd, cwd=frontend_dir)
    
    time.sleep(2)
    print("\n✅ All services running successfully!")
    print("   👉 Open your browser at: http://localhost:5173")
    print("   👉 Press Ctrl+C in this terminal to stop both servers.\n")
    
    def cleanup(signum=None, frame=None):
        print("\nStopping services...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, cleanup)
    signal.signal(signal.SIGTERM, cleanup)
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    main()
