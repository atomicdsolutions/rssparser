# RSS Feed Parser

A high-performance, scalable RSS feed parsing and web display application built with Python FastAPI microservices, React frontend, and HashiCorp deployment stack.

## 🚀 Features

- **Full Content Extraction**: Parse RSS feeds and extract complete articles, images, media, and metadata
- **Microservices Architecture**: Separate services for parsing, API, scheduling, and frontend
- **Real-time Updates**: Scheduled batch processing every 15 minutes with manual refresh capability
- **Modern UI**: React-based dashboard with unified feed view and individual feed pages
- **Scalable Deployment**: HashiCorp Nomad + Consul for container orchestration and service discovery
- **Production Ready**: Built for AWS/GCP deployment with Terraform support

## 📋 Supported Feed Types

- Blog RSS feeds (WordPress, static sites, etc.)
- Podcast RSS feeds (Simplecast, Anchor, etc.)
- YouTube channel feeds
- News RSS feeds
- Any valid RSS/Atom feed

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Web API      │    │  Feed Parser    │
│   (React)       │◄───┤   (FastAPI)     │◄───┤   (FastAPI)     │
│   Port: 3000    │    │   Port: 8002    │    │   Port: 8001    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Scheduler     │              │
         │              │   (AsyncIO)     │──────────────┘
         │              └─────────────────┘
         │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   Supabase      │
                    │  (PostgreSQL)   │
                    └─────────────────┘
```

## 🛠️ Tech Stack

- **Backend**: Python 3.9+, FastAPI, AsyncIO
- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Deployment**: HashiCorp Nomad, Consul
- **Monitoring**: Built-in health checks and logging
- **Load Balancing**: Traefik (configured in Nomad jobs)

## 📦 Quick Start

### Development Setup

1. **Clone and setup**:
   ```bash
   git clone <repository-url>
   cd FeedParser
   ./scripts/dev-setup.sh
   ```

2. **Configure environment**:
   ```bash
   # Update .env with your Supabase credentials
   cp .env.example .env
   nano .env
   ```

3. **Setup database**:
   - Create a Supabase project
   - Run the SQL in `database/schema/tables.sql`
   - Update `.env` with your Supabase URL and keys

4. **Start services**:
   ```bash
   ./scripts/start-dev.sh
   ```

5. **Add test feeds**:
   ```bash
   python scripts/add_test_feeds.py
   ```

6. **Access the application**:
   - Frontend: http://localhost:3000
   - API: http://localhost:8002
   - Parser: http://localhost:8001

### Production Deployment

1. **Prerequisites**:
   - HashiCorp Nomad cluster
   - HashiCorp Consul cluster
   - Traefik load balancer (optional)

2. **Configure Consul KV**:
   ```bash
   # Load configuration into Consul
   consul kv import @infrastructure/consul/kv-config.hcl
   ```

3. **Deploy services**:
   ```bash
   ./scripts/deploy.sh
   ```

4. **Access the application**:
   - Frontend: http://feedreader.local
   - API: http://api.feedreader.local
   - Parser: http://parser.feedreader.local

## 🔧 Configuration

### Environment Variables

Key environment variables (see `.env.example` for complete list):

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Feed Processing
FEED_UPDATE_INTERVAL_MINUTES=15
MAX_CONCURRENT_FEEDS=5

# Service URLs
FEED_PARSER_URL=http://localhost:8001
WEB_API_URL=http://localhost:8002
FRONTEND_URL=http://localhost:3000
```

### Consul Configuration

The application uses Consul for:
- Service discovery between microservices
- Configuration management via KV store
- Health monitoring and load balancing

Key KV pairs are defined in `infrastructure/consul/kv-config.hcl`.

## 📊 API Endpoints

### Web API Service (Port 8002)

- `GET /` - API information
- `GET /health` - Health check
- `GET /dashboard` - Dashboard statistics
- `GET /feeds` - List all feeds
- `POST /feeds` - Add new feed
- `GET /feeds/{id}` - Get specific feed
- `PUT /feeds/{id}` - Update feed
- `DELETE /feeds/{id}` - Delete feed
- `POST /feeds/{id}/refresh` - Manually refresh feed
- `GET /items` - Get feed items with pagination

### Feed Parser Service (Port 8001)

- `POST /parse` - Parse single RSS feed
- `POST /parse-batch` - Parse multiple feeds
- `GET /health` - Health check

## 🗄️ Database Schema

The application uses PostgreSQL (via Supabase) with the following main tables:

- `feeds` - RSS feed subscriptions
- `feed_items` - Individual articles/posts from feeds
- `feed_processing_logs` - Processing history and errors

See `database/schema/tables.sql` for complete schema.

## 🧪 Testing

Run tests for all services:

```bash
# Install test dependencies
pip install pytest

# Run tests
./scripts/dev-setup.sh --with-tests
```

Individual service tests:
```bash
cd services/feed-parser
python -m pytest test_parser.py -v
```

## 📈 Monitoring

### Health Checks

All services provide health check endpoints:
- Feed Parser: `GET /health`
- Web API: `GET /health`
- Scheduler: Process monitoring via Consul

### Logging

Services log to stdout with structured logging:
- Application logs
- Processing statistics
- Error tracking
- Performance metrics

### Metrics (Optional)

Prometheus metrics endpoints are available:
- Feed processing rates
- API response times
- Error rates
- Resource utilization

## 🚀 Deployment

### Local Development
```bash
./scripts/start-dev.sh
```

### HashiCorp Stack
```bash
./scripts/deploy.sh
```

### Individual Services
```bash
./scripts/deploy.sh --service feed-parser
./scripts/deploy.sh --service web-api
```

### Check Status
```bash
./scripts/deploy.sh --status
```

## 🔒 Security

- Environment variables for sensitive configuration
- Supabase Row Level Security (RLS) policies
- CORS configured for production
- Input validation on all endpoints
- Rate limiting capabilities

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 📞 Support

- Check the logs for error details
- Use health check endpoints for service status
- Review Consul service discovery for connectivity issues

## 🔄 Updates

The application automatically:
- Updates feeds every 15 minutes
- Cleans up old items (90+ days)
- Monitors service health
- Handles failures gracefully

## 🎯 Roadmap

- [ ] Enhanced content extraction (AI summarization)
- [ ] Real-time WebSocket updates
- [ ] Mobile app support
- [ ] Advanced filtering and search
- [ ] Social media integration
- [ ] Analytics dashboard