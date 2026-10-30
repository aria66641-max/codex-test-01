"""Create the runtime ZIP from an explicit allowlist; never include .env or old archives."""
from pathlib import Path
import zipfile
root=Path(__file__).resolve().parents[1]
files=['index.html','styles.css','app.js','ai-core.js','ai-ui.js','START.bat','launcher.cjs','.env.example','package.json','README.md','실행안내.md']
files += [str(p.relative_to(root)) for folder in ['server','tests','tools'] for p in (root/folder).glob('*') if p.suffix in ['.cjs','.py']]
output=root/'work'/'blog-seo-ai-final.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
    for name in sorted(files): z.write(root/name,name)
with zipfile.ZipFile(output) as z:
    assert z.testzip() is None
    assert '.env' not in z.namelist()
print(output)
