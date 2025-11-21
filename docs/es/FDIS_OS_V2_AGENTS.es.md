# FDIS OS v2 · PureMind  
## Agentes (ES)

## 1. Tipos de agentes

- Agentes de Ingesta
- Agentes de Visión
- Agentes Semánticos
- Agentes de Procesamiento
- Agentes de Validación y Seguridad
- Agentes de Exportación
- Agente de Orquestación

## 2. Ejemplos principales

- **FS_01 · Ingest Agent**  
  Clasifica el documento y decide el pipeline inicial.

- **FS_07 · OCR Agent**  
  Extrae texto de documentos impresos.

- **FS_12 · Handwriting Agent**  
  Reconoce escritura manual y devuelve texto con nivel de confianza.

- **FS_13 · Diagram Agent**  
  Interpreta diagramas y esquemas en forma de grafo.

- **FS_14 · Restoration Agent**  
  Mejora imágenes problemáticas (ruido, sombras, inclinación).

- **FS_02 · Structure Agent**  
  Reconstruye la estructura lógica: títulos, secciones, párrafos, listas.

- **FS_10 · Semantic Refinement Agent**  
  Refina texto, corrige detalles y normaliza formatos.

- **FS_11 · Table Agent**  
  Reconstruye tablas complejas, incluso sin bordes.

- **FS_20 · Security Agent**  
  Busca indicios de manipulación visual.

- **FS_21 · Consistency Agent**  
  Comprueba totales y coherencia numérica.

- **FS_24 · Deep QA Agent**  
  Aplica razonamiento profundo sobre el documento final.

- **FS_09 · Export Agent**  
  Genera Excel, Word, JSON, GraphML y HTML.

- **OS_Controller**  
  Orquesta todo el sistema.

