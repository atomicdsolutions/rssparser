# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FeedParser is a high-performance RSS feed parsing and web display application designed for speed and scalability. It converts RSS feeds (blogs, podcasts, YouTube) into fast-loading web pages with both unified dashboard and individual feed views.

## Technology Stack

- **Backend**: Python with FastAPI microservices
- **Database**: Supabase (PostgreSQL + Storage + Real-time)
- **Frontend**: React/Vue.js for dashboard and feed pages  
- **Deployment**: HashiCorp stack (Nomad + Consul) on AWS/GCP
- **Content Processing**: Full extraction (text, images, media, metadata)
- **Update Strategy**: Scheduled batch processing every 15 minutes

## Architecture

### Microservices Design
1. **Feed Parser Service** - RSS parsing and content extraction
2. **Web API Service** - REST endpoints for frontend
3. **Frontend Service** - Dashboard and individual feed viewers

### Data Flow
- Nomad cron jobs trigger feed parsing every 15 minutes
- Parser extracts full content and stores in Supabase
- Web API serves data via REST endpoints
- Frontend displays unified dashboard + individual feed pages
- Consul handles service discovery between microservices

### Directory Structure
```
/
├── services/
│   ├── feed-parser/     # RSS parsing microservice
│   ├── web-api/         # REST API microservice
│   └── frontend/        # Web interface
├── infrastructure/
│   ├── nomad/          # Nomad job definitions
│   └── consul/         # Service discovery config
├── database/
│   └── schema/         # Supabase schema definitions
└── scripts/            # Deployment and utility scripts
```

## Development Commands

### Environment Setup
- `python -m venv venv` - Create virtual environment
- `source venv/bin/activate` (Linux/Mac) or `venv\Scripts\activate` (Windows)
- `pip install -r requirements.txt` - Install Python dependencies

### Running Services Locally
- `cd services/feed-parser && uvicorn main:app --reload --port 8001`
- `cd services/web-api && uvicorn main:app --reload --port 8002`
- `cd services/frontend && npm run dev`

### Testing and Linting
- `pytest` - Run all tests
- `black .` - Format Python code
- `flake8` - Check Python code quality

### Deployment
- `nomad job run infrastructure/nomad/feed-parser.hcl` - Deploy parser service
- `nomad job run infrastructure/nomad/web-api.hcl` - Deploy API service
- `nomad job run infrastructure/nomad/frontend.hcl` - Deploy frontend

## Configuration

- Environment variables for Supabase connection in each service
- Consul KV store for shared configuration
- Feed URLs and processing intervals configured via API endpoints