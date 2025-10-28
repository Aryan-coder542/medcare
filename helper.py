import os
import glob
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings

def extract_and_split_pdfs_from_directory(directory_path, chunk_size=500, chunk_overlap=50):
    """
    Extract and chunk PDF content optimized for large medical documents.
    
    Optimizations for large PDFs (2000-4000 pages):
    - Smaller chunk size (500 vs 1000) = more granular retrieval
    - Less overlap (50 vs 200) = fewer total chunks
    - Error handling for corrupted pages
    - Progress tracking for long processing
    """
    
    pdf_pattern = os.path.join(directory_path, "*.pdf")
    pdf_files = glob.glob(pdf_pattern)
    
    if not pdf_files:
        raise ValueError(f"No PDF files found in directory: {directory_path}")
    
    print(f"\n📚 Found {len(pdf_files)} PDF file(s)")
    print(f"⚙️  Chunk size: {chunk_size}, Overlap: {chunk_overlap}")
    print(f"⏱️  Estimated time: {len(pdf_files) * 5}-{len(pdf_files) * 15} minutes\n")
    
    all_text_chunks = []
    successful_pdfs = 0
    failed_pdfs = []
    total_pages_processed = 0
    
    for idx, pdf_file in enumerate(pdf_files, 1):
        try:
            filename = os.path.basename(pdf_file)
            print(f"[{idx}/{len(pdf_files)}] Processing: {filename}")
            
            # Load PDF with error handling
            loader = PyPDFLoader(pdf_file)
            documents = loader.load()
            total_pages_processed += len(documents)
            
            print(f"  📄 Loaded {len(documents)} pages")
            
            # Split into chunks
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""]  # Smart splitting
            )
            text_chunks = text_splitter.split_documents(documents)
            
            # Add source metadata
            for chunk in text_chunks:
                chunk.metadata['source_file'] = filename
            
            all_text_chunks.extend(text_chunks)
            successful_pdfs += 1
            
            print(f"  ✓ Created {len(text_chunks)} chunks")
            print(f"  📊 Running total: {len(all_text_chunks)} chunks\n")
            
        except Exception as e:
            print(f"  ✗ Error: {str(e)[:80]}")
            failed_pdfs.append(filename)
            continue
    
    # Summary
    print(f"\n{'='*60}")
    print(f"✅ Successfully processed: {successful_pdfs}/{len(pdf_files)} PDFs")
    print(f"📄 Total pages processed: {total_pages_processed}")
    print(f"📦 Total chunks created: {len(all_text_chunks)}")
    
    if failed_pdfs:
        print(f"⚠️  Failed PDFs ({len(failed_pdfs)}): {', '.join(failed_pdfs)}")
    
    print(f"{'='*60}\n")
    
    if not all_text_chunks:
        raise ValueError("No text chunks created. All PDFs failed.")
    
    return all_text_chunks

def download_embeddings():
    """Download embeddings model - using smaller model for speed."""
    print("🔄 Loading embedding model (all-MiniLM-L6-v2)...")
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    embeddings = HuggingFaceEmbeddings(
        model_name=model_name,
        model_kwargs={'device': 'cpu'},  # Use CPU for stability
        encode_kwargs={'normalize_embeddings': True}  # Better for similarity search
    )
    print("✓ Embedding model loaded\n")
    return embeddings
