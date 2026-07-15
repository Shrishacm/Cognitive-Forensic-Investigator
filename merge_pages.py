import re

with open("frontend/src/pages/QueuePage.jsx") as f:
    queue_content = f.read()

with open("frontend/src/pages/EvidencePage.jsx") as f:
    evidence_content = f.read()

# 1. Merge imports
imports = set()
for line in queue_content.split('\n'):
    if line.startswith('import '): imports.add(line)
for line in evidence_content.split('\n'):
    if line.startswith('import '): imports.add(line)

# Wait, this regex approach might be brittle.
# Let's extract the subcomponents from QueuePage
subcomponents = re.search(r"// ── Sub-components ─────────────────────────────────────────(.*?)// ── Main page ─────────────────────────────────────────────", queue_content, re.DOTALL).group(1)

# Extract main EvidencePage logic
evidence_main = re.search(r"export default function EvidencePage\(\) \{(.*)", evidence_content, re.DOTALL).group(1)

# Extract main QueuePage logic (state, hooks, functions)
queue_main = re.search(r"export default function QueuePage\(\) \{(.*?)return \(", queue_content, re.DOTALL).group(1)

# Extract JSX parts from QueuePage
queue_jsx = re.search(r"return \(\s*<PageLayout[^>]*>(.*?)</PageLayout>\s*\)\s*\}\s*$", queue_content, re.DOTALL).group(1)

# Actually, I can just use python to do this safely and run it.
