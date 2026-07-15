import sys

with open('frontend/src/pages/EvidencePage.jsx', 'r') as f:
    lines = f.readlines()

sidebar_start = -1
main_start = -1
end_grid = -1

for i, l in enumerate(lines):
    if "{/* LEFT SIDEBAR: INGESTION QUEUE */}" in l:
        sidebar_start = i
    if "{/* MAIN CONTENT AREA: RESOURCES, UPLOAD, EVIDENCE */}" in l:
        main_start = i
    if "      <ConfirmDialog" in l:
        end_grid = i - 2 # 2 lines above ConfirmDialog is the closing div of the grid. Let's verify this.

# Let's read from lines directly to see the structure:
# lines[sidebar_start:main_start] is the sidebar.
# lines[main_start:end_grid] is the main content area.
# We swap them!

if sidebar_start != -1 and main_start != -1 and end_grid != -1:
    # Change the comment names
    lines[sidebar_start] = lines[sidebar_start].replace("LEFT SIDEBAR", "RIGHT SIDEBAR")
    
    sidebar_block = lines[sidebar_start:main_start]
    main_block = lines[main_start:end_grid]
    
    new_lines = lines[:sidebar_start] + main_block + sidebar_block + lines[end_grid:]
    with open('frontend/src/pages/EvidencePage.jsx', 'w') as f:
        f.writelines(new_lines)
    print("Swapped successfully")
else:
    print("Could not find boundaries")
