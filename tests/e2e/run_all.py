"""Runs every end-to-end test file in this folder and fails if any of them fails."""
import glob, os, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__)); bad = []
for f in sorted(glob.glob(os.path.join(here, "*.e2e.py"))):
    print("\n=== " + os.path.basename(f) + " ===", flush=True)
    if subprocess.run([sys.executable, f], cwd=here).returncode: bad.append(os.path.basename(f))
print("\nFAILED: " + ", ".join(bad) if bad else "\nAll end-to-end tests passed.")
sys.exit(1 if bad else 0)
