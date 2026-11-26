#!/usr/bin/env python3
"""Build, verify, and archive only the files needed to use or publish the project."""
from pathlib import Path
import hashlib
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
subprocess.run(['npm', 'run', 'check'], cwd=root, check=True)
folders = ['src', 'tests', 'scripts', 'public', '.github', 'dist']
files = ['README.md', 'LICENSE', 'package.json', 'package-lock.json', 'index.html', 'vite.config.js', '.gitignore', '.nvmrc']
paths = [root / name for name in files]
for folder in folders:
    paths.extend(path for path in (root / folder).rglob('*') if path.is_file() and '__pycache__' not in path.parts and path.suffix != '.pyc' and path.name != '.DS_Store' and not path.name.startswith('.env'))
archive = root.parent / 'black-friday-studio.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as output:
    for path in sorted(paths):
        if path.is_symlink():
            raise RuntimeError(f'Unexpected symlink: {path}')
        output.write(path, Path(root.name) / path.relative_to(root))
with zipfile.ZipFile(archive) as output:
    if output.testzip() is not None:
        raise RuntimeError('ZIP integrity check failed')
digest = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.zip.sha256').write_text(f'{digest}  {archive.name}\n')
print(f'Created {archive} ({archive.stat().st_size:,} bytes; {len(paths)} files)')
print(f'SHA-256: {digest}')
