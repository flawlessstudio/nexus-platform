# FDIS OS v2 · PureMind  
## Playbooks (Flujos operativos · ES)

### Playbook 1 — PDF → Excel

- Objetivo: extraer tablas y generar un Excel limpio.
- Pipeline: FS_01 → FS_07 → FS_11 → FS_10 → FS_21 → FS_09.

### Playbook 2 — Escaneado → Word editable

- Objetivo: reconstruir documentos largos (contratos, manuales).
- Pipeline: FS_01 → FS_14 → FS_07 → FS_02 → FS_10 → FS_09.

### Playbook 3 — Manuscrito → Texto estructurado

- Objetivo: convertir notas manuscritas en texto ordenado.
- Pipeline: FS_01 → FS_12 → FS_10 → FS_21 → FS_09.

### Playbook 4 — Diagrama → GraphML

- Objetivo: transformar diagramas técnicos en grafos.
- Pipeline: FS_01 → FS_13 → FS_17 → FS_09.

### Playbook 5 — Factura → Excel + QA

- Objetivo: extraer datos de facturas y validarlos.
- Pipeline: FS_01 → FS_07 → FS_11 → FS_10 → FS_21 → FS_09.

