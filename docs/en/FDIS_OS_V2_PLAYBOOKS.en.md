# FDIS OS v2 · PureMind  
## Playbooks (Operational Flows · EN)

### Playbook 1 — PDF → Excel

- Goal: extract tables and generate a clean Excel file.  
- Pipeline: FS_01 → FS_07 → FS_11 → FS_10 → FS_21 → FS_09.

### Playbook 2 — Scanned → Editable Word

- Goal: rebuild long documents (contracts, manuals).  
- Pipeline: FS_01 → FS_14 → FS_07 → FS_02 → FS_10 → FS_09.

### Playbook 3 — Handwritten → Structured Text

- Goal: convert handwritten notes into ordered text.  
- Pipeline: FS_01 → FS_12 → FS_10 → FS_21 → FS_09.

### Playbook 4 — Diagram → GraphML

- Goal: turn technical diagrams into graphs.  
- Pipeline: FS_01 → FS_13 → FS_17 → FS_09.

### Playbook 5 — Invoice → Excel + QA

- Goal: extract invoice data and validate it.  
- Pipeline: FS_01 → FS_07 → FS_11 → FS_10 → FS_21 → FS_09.

