#!/usr/bin/env python3
"""
PDF Document Processor - Phase 2
Chunks PDFs and extracts text to markdown files
"""

import sys
import os
from pathlib import Path
import json
from datetime import datetime

# Required: pip install pdfplumber
import pdfplumber


def main(file_path, workspace_path, file_name):
    """
    Process PDF: chunk and extract text to markdown

    Args:
        file_path: Path to uploaded PDF file
        workspace_path: User's workspace directory
        file_name: Original filename (without extension)
    """
    print(f"Processing: {file_path}")
    print(f"Workspace: {workspace_path}")
    print(f"Document name: {file_name}")

    # Create knowledge base directory structure
    kb_path = create_kb_structure(workspace_path, file_name)
    print(f"Knowledge base path: {kb_path}")

    # Chunk the PDF
    chunks = chunk_pdf(file_path, pages_per_chunk=5)
    print(f"Created {len(chunks)} chunks")

    # Extract text from each chunk and save as markdown
    extract_and_save_chunks(file_path, chunks, kb_path)

    # Save metadata
    save_metadata(kb_path, file_name, file_path, len(chunks))

    print("✅ Processing complete!")


def create_kb_structure(workspace_path, file_name):
    """
    Create directory structure for knowledge base

    Returns:
        Path to document's knowledge base directory
    """
    # Remove file extension if present
    clean_name = Path(file_name).stem

    # Create: workspace/knowledge-base/document-name/
    kb_base = Path(workspace_path) / "knowledge-base" / clean_name
    kb_base.mkdir(parents=True, exist_ok=True)

    # Create chunks subdirectory
    chunks_dir = kb_base / "chunks"
    chunks_dir.mkdir(exist_ok=True)

    return kb_base


def chunk_pdf(file_path, pages_per_chunk=5):
    """
    Divide PDF into chunks by page ranges

    Args:
        file_path: Path to PDF file
        pages_per_chunk: Number of pages per chunk

    Returns:
        List of chunk definitions with start/end pages
    """
    with pdfplumber.open(file_path) as pdf:
        total_pages = len(pdf.pages)
        print(f"Total pages: {total_pages}")

        chunks = []
        chunk_num = 1

        for start_idx in range(0, total_pages, pages_per_chunk):
            end_idx = min(start_idx + pages_per_chunk, total_pages)

            chunks.append({
                'chunk_number': chunk_num,
                'start_page': start_idx + 1,  # 1-indexed for user display
                'end_page': end_idx,
                'start_idx': start_idx,       # 0-indexed for code
                'end_idx': end_idx
            })

            chunk_num += 1

        return chunks


def extract_and_save_chunks(file_path, chunks, kb_path):
    """
    Extract text from each chunk and save as markdown

    Args:
        file_path: Path to PDF file
        chunks: List of chunk definitions
        kb_path: Knowledge base directory path
    """
    with pdfplumber.open(file_path) as pdf:
        for chunk in chunks:
            print(f"Processing chunk {chunk['chunk_number']}: pages {chunk['start_page']}-{chunk['end_page']}")

            # Extract text from all pages in this chunk
            chunk_text = []

            for page_idx in range(chunk['start_idx'], chunk['end_idx']):
                page = pdf.pages[page_idx]
                text = page.extract_text()

                if text:
                    # Add page number header
                    chunk_text.append(f"## Page {page_idx + 1}\n")
                    chunk_text.append(text)
                    chunk_text.append("\n\n---\n\n")  # Page separator

            # Combine all text for this chunk
            full_text = "\n".join(chunk_text)

            # Create markdown content with metadata
            markdown = create_markdown(chunk, full_text)

            # Save to file: chunk-001.md, chunk-002.md, etc.
            chunk_file = kb_path / "chunks" / f"chunk-{chunk['chunk_number']:03d}.md"
            chunk_file.write_text(markdown, encoding='utf-8')

            print(f"  ✓ Saved: {chunk_file.name}")


def create_markdown(chunk, text):
    """
    Format extracted text as markdown with metadata

    Args:
        chunk: Chunk definition dict
        text: Extracted text content

    Returns:
        Formatted markdown string
    """
    markdown = f"""# Chunk {chunk['chunk_number']}

**Pages**: {chunk['start_page']}-{chunk['end_page']}

---

{text}
"""
    return markdown


def save_metadata(kb_path, file_name, file_path, chunk_count):
    """
    Save processing metadata as JSON

    Args:
        kb_path: Knowledge base directory
        file_name: Original filename
        file_path: Path to original file
        chunk_count: Number of chunks created
    """
    metadata = {
        'file_name': file_name,
        'original_path': str(file_path),
        'processed_at': datetime.now().isoformat(),
        'chunk_count': chunk_count,
        'pages_per_chunk': 5,
        'status': 'completed'
    }

    metadata_file = kb_path / "metadata.json"
    metadata_file.write_text(json.dumps(metadata, indent=2), encoding='utf-8')

    print(f"  ✓ Saved: metadata.json")


if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Usage: python3 process_document.py <file_path> <workspace_path> <file_name>")
        sys.exit(1)

    file_path = sys.argv[1]
    workspace_path = sys.argv[2]
    file_name = sys.argv[3]

    # Verify file exists
    if not os.path.exists(file_path):
        print(f"Error: File not found: {file_path}")
        sys.exit(1)

    # Run processing
    try:
        main(file_path, workspace_path, file_name)
    except Exception as e:
        print(f"Error processing document: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
