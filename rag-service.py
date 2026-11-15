"""
Standalone RAG Service for ApnaGhar
Run this locally and expose via ngrok
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
from pathlib import Path

# Add rag-pipeline to path
sys.path.insert(0, str(Path(__file__).parent / 'rag-pipeline'))

from src.query_engine import RealEstateRAG

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize RAG engine
print("🤖 Initializing RAG engine...")
rag_engine = RealEstateRAG()
print("✅ RAG engine ready!")


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'RAG service is operational',
        'rag_available': True
    })


@app.route('/query', methods=['POST'])
def query():
    """
    Handle RAG queries
    Body: {"query": "...", "format": "detailed"}
    """
    data = request.json
    query_text = data.get('query', '').strip()
    format_type = data.get('format', 'detailed')
    
    if not query_text:
        return jsonify({'error': 'Query text is required'}), 400
    
    try:
        result = rag_engine.search_and_format(
            query=query_text,
            format_type=format_type
        )
        result['rag_available'] = True
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'error': str(e),
            'answer': 'An error occurred processing your query.',
            'rag_available': False
        }), 500


@app.route('/search', methods=['POST'])
def search_properties():
    """
    Structured property search
    Body: {"bedrooms": 3, "city": "Mumbai", ...}
    """
    data = request.json
    
    try:
        result = rag_engine.search_properties(
            bedrooms=data.get('bedrooms'),
            city=data.get('city'),
            max_price=data.get('max_price'),
            min_price=data.get('min_price'),
            status=data.get('status', 'available')
        )
        result['rag_available'] = True
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'error': str(e),
            'rag_available': False
        }), 500


if __name__ == '__main__':
    # 8001 by default so it doesn't collide with Django on 8000
    port = int(os.getenv('RAG_PORT', '8001'))
    print(f"RAG service listening on http://0.0.0.0:{port}")
    print("Local: the backend reaches it via RAG_SERVICE_URL (default http://localhost:8001).")
    print(f"Hosted backend: expose it (e.g. `ngrok http {port}`) and set RAG_SERVICE_URL to that URL.")
    app.run(host='0.0.0.0', port=port, debug=False)
