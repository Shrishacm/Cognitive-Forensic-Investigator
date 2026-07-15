import os
import re

DIR = 'frontend/src'

# Map hardcoded strings to CSS variables
MAPPINGS = {
    r"'rgba\(255,255,255,0\.02\)'": "var(--color-white-03)",
    r"'rgba\(255,255,255,0\.03\)'": "var(--color-white-03)",
    r"'rgba\(255, 255, 255, 0\.03\)'": "var(--color-white-03)",
    r"'rgba\(255,255,255,0\.04\)'": "var(--color-white-04)",
    r"'rgba\(255, 255, 255, 0\.04\)'": "var(--color-white-04)",
    r"'rgba\(255,255,255,0\.05\)'": "var(--color-white-05)",
    r"'rgba\(255, 255, 255, 0\.05\)'": "var(--color-white-05)",
    r"'rgba\(255,255,255,0\.06\)'": "var(--color-white-06)",
    r"'rgba\(255, 255, 255, 0\.06\)'": "var(--color-white-06)",
    r"'rgba\(255,255,255,0\.07\)'": "var(--color-white-07)",
    r"'rgba\(255, 255, 255, 0\.07\)'": "var(--color-white-07)",
    r"'rgba\(255,255,255,0\.08\)'": "var(--color-white-08)",
    r"'rgba\(255, 255, 255, 0\.08\)'": "var(--color-white-08)",
    r"'rgba\(255,255,255,0\.09\)'": "var(--color-white-09)",
    r"'rgba\(255, 255, 255, 0\.09\)'": "var(--color-white-09)",
    r"'rgba\(255,255,255,0\.1\)'": "var(--color-white-1)",
    r"'rgba\(255, 255, 255, 0\.1\)'": "var(--color-white-1)",
    r"'rgba\(255,255,255,0\.15\)'": "var(--color-white-1)", # Approximate 0.15 to 0.1
    r"'rgba\(255,255,255,0\.2\)'": "var(--color-white-2)",
    r"'rgba\(255, 255, 255, 0\.2\)'": "var(--color-white-2)",
    r"'rgba\(255,255,255,0\.25\)'": "var(--color-white-2)",
    r"'rgba\(255,255,255,0\.3\)'": "var(--color-white-3)",
    r"'rgba\(255, 255, 255, 0\.3\)'": "var(--color-white-3)",
    r"'rgba\(255,255,255,0\.35\)'": "var(--color-white-3)",
    r"'rgba\(255,255,255,0\.4\)'": "var(--color-white-4)",
    r"'rgba\(255, 255, 255, 0\.4\)'": "var(--color-white-4)",
    r"'rgba\(255,255,255,0\.5\)'": "var(--color-white-5)",
    r"'rgba\(255, 255, 255, 0\.5\)'": "var(--color-white-5)",
    r"'rgba\(255,255,255,0\.55\)'": "var(--color-white-5)",
    r"'rgba\(255,255,255,0\.6\)'": "var(--color-white-6)",
    r"'rgba\(255, 255, 255, 0\.6\)'": "var(--color-white-6)",
    r"'rgba\(255,255,255,0\.7\)'": "var(--color-white-6)",
    r"'rgba\(255,255,255,0\.8\)'": "var(--color-white-6)",
    r"'rgba\(255,255,255,0\.9\)'": "var(--color-white-full)",
    r"'#fff'": "var(--color-white-full)",
    r"'#ffffff'": "var(--color-white-full)",
    r"'white'": "var(--color-white-full)",
    r"'#04050b'": "var(--bg-app)",
    r"'#08090e'": "var(--bg-app)",
    r"'#e2e4f0'": "var(--text-primary)",
    r"'#f1f3ff'": "var(--text-primary)",
}

for root, dirs, files in os.walk(DIR):
    for f in files:
        if f.endswith('.jsx') or f.endswith('.js'):
            filepath = os.path.join(root, f)
            with open(filepath, 'r') as file:
                content = file.read()
            
            original_content = content
            for pattern, replacement in MAPPINGS.items():
                content = re.sub(pattern, f"'{replacement}'", content)

            if content != original_content:
                with open(filepath, 'w') as file:
                    file.write(content)
                print(f"Updated {filepath}")
