import subprocess
import sys
import os
import time

def run_backend():
    print("Starting Backend...")
    os.chdir("backend")
    # Use the virtual environment's Python executable
    venv_python = os.path.join(os.getcwd(), "venv", "Scripts", "python.exe")
    if not os.path.exists(venv_python):
        # Fallback if venv is not found
        print("Warning: Virtual environment not found. Falling back to system Python.")
        venv_python = sys.executable
    return subprocess.Popen([venv_python, "-m", "uvicorn", "main:app", "--reload", "--port", "8000"])

def run_frontend():
    print("Starting Frontend...")
    os.chdir("frontend")
    # For Windows, we might need shell=True for npm
    return subprocess.Popen(["npm", "run", "dev"], shell=True)

if __name__ == "__main__":
    root_dir = os.getcwd()
    
    backend_proc = None
    frontend_proc = None
    
    try:
        backend_proc = run_backend()
        os.chdir(root_dir)
        
        # Small delay to let backend start
        time.sleep(2)
        
        frontend_proc = run_frontend()
        os.chdir(root_dir)
        
        print("\nNovaMind is running!")
        print("Backend: http://localhost:8000")
        print("Frontend: http://localhost:5173")
        print("Press Ctrl+C to stop both servers.")
        
        while True:
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("\nStopping servers...")
        if backend_proc:
            backend_proc.terminate()
        if frontend_proc:
            # On Windows, taskkill might be needed for npm processes
            if os.name == 'nt':
                subprocess.run(['taskkill', '/F', '/T', '/PID', str(frontend_proc.pid)], capture_output=True)
            else:
                frontend_proc.terminate()
        print("Stopped.")
