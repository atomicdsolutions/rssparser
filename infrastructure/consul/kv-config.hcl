# Consul KV Store Configuration for RSS Feed Parser

# Application Configuration
config/app/name = "RSS Feed Parser"
config/app/version = "1.0.0"
config/app/environment = "production"

# Supabase Configuration (Store actual values securely)
config/supabase/url = "https://your-project.supabase.co"
config/supabase/anon_key = "your-anon-key-here"
config/supabase/service_role_key = "your-service-role-key-here"

# Feed Processing Configuration
config/scheduler/update_interval = "15"  # minutes
config/scheduler/max_concurrent = "5"    # concurrent feed processing
config/scheduler/cleanup_days = "90"     # days to keep old items

# Service URLs (for fallback when service discovery fails)
config/services/feed_parser_url = "http://feed-parser.service.consul:8001"
config/services/web_api_url = "http://web-api.service.consul:8002"
config/services/frontend_url = "http://frontend.service.consul:3000"

# Database Configuration
config/database/max_feed_items_per_batch = "100"
config/database/connection_timeout = "30"
config/database/retry_attempts = "3"

# Monitoring and Alerting
config/monitoring/enabled = "true"
config/monitoring/prometheus_endpoint = "/metrics"
config/monitoring/log_level = "INFO"

# Security Configuration
config/security/cors_origins = "*"  # Configure for production
config/security/rate_limit_enabled = "true"
config/security/rate_limit_per_minute = "60"

# Cache Configuration
config/cache/enabled = "true"
config/cache/ttl_minutes = "30"
config/cache/max_size_mb = "100"

# Feature Flags
config/features/batch_processing = "true"
config/features/auto_cleanup = "true"
config/features/service_discovery = "true"
config/features/health_monitoring = "true"

# Traefik Load Balancer Configuration
config/traefik/domain = "feedreader.local"
config/traefik/ssl_enabled = "false"  # Set to true for production with SSL

# Deployment Configuration
config/deployment/max_parallel_updates = "1"
config/deployment/health_check_timeout = "300"  # seconds
config/deployment/auto_revert = "true"

# Resource Limits
config/resources/feed_parser/cpu = "500"     # MHz
config/resources/feed_parser/memory = "512"  # MB
config/resources/web_api/cpu = "1000"       # MHz
config/resources/web_api/memory = "1024"    # MB
config/resources/scheduler/cpu = "1000"     # MHz
config/resources/scheduler/memory = "1024"  # MB
config/resources/frontend/cpu = "300"       # MHz
config/resources/frontend/memory = "256"    # MB