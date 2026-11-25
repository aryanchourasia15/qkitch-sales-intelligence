"""Run app tasks without relying on PowerShell script execution policy or system npm."""
from pathlib import Path
import os
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
node = shutil.which('node') or str(root.parent/'LinkedIn_Job_Assistant/venv/Lib/site-packages/playwright/driver/node.exe')
if not Path(node).exists():
    raise SystemExit('Install Node.js 22.12+ first.')
npm = root/'.tools/npm/package/bin/npm-cli.js'
env = os.environ.copy()
env['PATH'] = str(Path(node).parent) + os.pathsep + env.get('PATH', '')
task = sys.argv[1] if len(sys.argv) > 1 else 'dev'
command = [node, str(npm), 'run', task, *sys.argv[2:]] if npm.exists() else [shutil.which('npm') or 'npm', 'run', task, *sys.argv[2:]]
sys.exit(subprocess.call(command, cwd=root, env=env, shell=False))
