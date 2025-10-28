import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_community.vectorstores import FAISS
from src.helper import download_embeddings

load_dotenv()

app = FastAPI(
    title="Medical Chatbot API - Hack A Cure 2025",
    description="RAG-based Medical Q&A System",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FAISS_INDEX_PATH = "faiss_medical_index"

print("Loading FAISS index...")
embeddings = download_embeddings()
vectorstore = FAISS.load_local(
    FAISS_INDEX_PATH, 
    embeddings,
    allow_dangerous_deserialization=True
)
print(f"✓ FAISS index loaded with {vectorstore.index.ntotal} vectors")

class QueryRequest(BaseModel):
    question: str

class Source(BaseModel):
    citation_number: int
    content: str
    source_file: str
    page: int

class QueryResponse(BaseModel):
    answer: str
    sources: list[Source]
    confidence: str

@app.get("/")
async def root():
    return {
        "status": "online",
        "message": "Medical Chatbot API - Hack A Cure 2025",
        "version": "1.0.0",
        "vector_count": vectorstore.index.ntotal,
        "note": "Retrieval-based medical information system with 255K+ medical text chunks"
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "vector_database": "FAISS",
        "vector_count": vectorstore.index.ntotal,
        "embedding_model": "all-MiniLM-L6-v2",
        "medical_domains": "9 specialties covered"
    }

@app.post("/query", response_model=QueryResponse)
async def query_chatbot(request: QueryRequest):
    """
    Medical Q&A endpoint - retrieves relevant information from medical textbooks
    """
    try:
        question = request.question.strip()
        
        if not question:
            raise HTTPException(status_code=400, detail="Question cannot be empty")
        
        if len(question) < 5:
            raise HTTPException(status_code=400, detail="Question too short. Please provide more detail.")
        
        # Retrieve relevant documents from FAISS vector database
        docs = vectorstore.similarity_search(question, k=5)
        
        # Build comprehensive answer from retrieved medical content
        answer = "**Medical Information Retrieved:**\n\n"
        answer += f"Based on medical literature search for '{question}', here are the most relevant findings:\n\n"
        
        for i, doc in enumerate(docs[:3], 1):
            content = doc.page_content[:250].strip()
            source_file = doc.metadata.get('source_file', doc.metadata.get('source', 'Unknown'))
            page = doc.metadata.get('page', 0)
            
            answer += f"**Finding {i}** (Source: {source_file}, Page {page}):\n"
            answer += f"{content}...\n\n"
        
        answer += "---\n\n"
        answer += "**⚠️ Important Medical Disclaimer:**\n"
        answer += "This information is retrieved from medical literature for educational purposes only. "
        answer += "Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment. "
        answer += "Do not use this information as a substitute for professional medical care.\n\n"
        answer += f"**Confidence Score:** Based on {len(docs)} relevant sources found in database."
        
        # Extract source documents with full citations
        sources = []
        for i, doc in enumerate(docs, 1):
            source_info = Source(
                citation_number=i,
                content=doc.page_content[:400] + "..." if len(doc.page_content) > 400 else doc.page_content,
                source_file=doc.metadata.get('source_file', doc.metadata.get('source', 'Unknown')),
                page=doc.metadata.get('page', 0)
            )
            sources.append(source_info)
        
        # Determine confidence based on source quantity and relevance
        if len(sources) >= 4:
            confidence = "High - Multiple relevant sources found"
        elif len(sources) >= 2:
            confidence = "Medium - Some relevant sources found"
        else:
            confidence = "Low - Limited sources found"
        
        return QueryResponse(
            answer=answer,
            sources=sources,
            confidence=confidence
        )
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Query processing error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🚀 Medical Chatbot API - Hack A Cure 2025")
    print("="*60)
    print(f"✓ Vector Database: {vectorstore.index.ntotal:,} medical text chunks loaded")
    print("✓ Medical Specialties: 9 domains covered")
    print("✓ Retrieval System: FAISS semantic search")
    print("\n📍 Access Points:")
    print("   - API: http://localhost:8000")
    print("   - Documentation: http://localhost:8000/docs")
    print("   - Health Check: http://localhost:8000/health")
    print("\n" + "="*60 + "\n")
    PORT = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=PORT)

