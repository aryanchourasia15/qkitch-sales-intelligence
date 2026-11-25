"""Bootstrap npm inside this checkout when npm is not installed system-wide."""
from pathlib import Path
from urllib.request import urlopen
import base64
import hashlib
import io
import json
import os
import shutil
import subprocess
import tarfile

root = Path(__file__).resolve().parents[1]
node = shutil.which('node') or str(root.parent/'LinkedIn_Job_Assistant/venv/Lib/site-packages/playwright/driver/node.exe')
if not Path(node).exists():
    raise SystemExit('Install Node.js 22.12+ and rerun this script.')
npm = root/'.tools/npm/package/bin/npm-cli.js'
if not npm.exists():
    meta = json.load(urlopen('https://registry.npmjs.org/npm/11.6.2', timeout=60))
    raw = urlopen(meta['dist']['tarball'], timeout=60).read()
    expected = meta['dist']['integrity']
    actual = 'sha512-' + base64.b64encode(hashlib.sha512(raw).digest()).decode()
    if actual != expected:
        raise ValueError('npm archive integrity mismatch')
    dest = npm.parents[2]
    dest.mkdir(parents=True, exist_ok=True)
    with tarfile.open(fileobj=io.BytesIO(raw), mode='r:gz') as tar:
        for item in tar.getmembers():
            if not (dest/item.name).resolve().is_relative_to(dest.resolve()):
                raise ValueError('Invalid archive path')
        tar.extractall(dest, filter='data')
env = os.environ.copy()
env['PATH'] = str(Path(node).parent) + os.pathsep + env.get('PATH', '')
subprocess.run([node, str(npm), 'install', '--no-audit', '--no-fund'], cwd=root, env=env, check=True)
