# FDIS OS v2 · PureMind  
## Architecture Specification (EN)

## 1. Overview

The architecture of FDIS OS v2 · PureMind is organized into seven layers that turn a messy document into a structured, validated representation:

1. Ingestion Layer  
2. Vision Layer  
3. Semantic Layer  
4. Processing Layer  
5. Validation & QA Layer  
6. Export Layer  
7. Orchestration Layer  

Each layer has specialized agents and decision rules.

## 2. Ingestion Layer

Responsible for:

- detecting the file type (PDF, image, batch, etc.)  
- deciding whether OCR, restoration or diagram/handwriting analysis is needed  
- extracting basic metadata  
- choosing the best initial processing flow  

## 3. Vision Layer

Includes:

- OCR for printed text  
- OCR for handwriting  
- visual restoration (noise, shadows, skew)  
- segmentation into zones: text, tables, images, diagrams  
- column and block detection  

This layer answers:  
**“What is actually drawn on the page?”**

## 4. Semantic Layer

Tasks:

- reconstruct document hierarchy (headings, sections, paragraphs, lists)  
- detect entities (dates, amounts, names, keys)  
- assign roles (title, description, note, value, etc.)  
- build internal relationships  

It answers:  
**“What does each piece of information represent?”**

## 5. Processing Layer

Responsibilities:

- rebuild tables (with or without borders)  
- normalize units and numeric formats  
- clean text (spaces, artifacts, broken lines)  
- reorder content so it makes logical sense  

## 6. Validation & QA Layer

Checks:

- totals and sums  
- consistency across related values  
- obvious signs of manipulation  
- internal contradictions  

When something is off, it can flag the document as “needs human review”.

## 7. Export Layer

Outputs:

- Excel (XLSX)  
- Word (DOCX)  
- JSON  
- GraphML  
- HTML  

while preserving hierarchy and key relationships.

## 8. Orchestration Layer

Decides:

- which agents will run  
- in what order  
- with which parameters  
- which alternative routes to use if one branch fails  
- when to execute QA  

The result is a dynamic pipeline tailored to each document.

