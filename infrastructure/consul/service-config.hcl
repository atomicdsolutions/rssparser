# Consul Service Configuration for RSS Feed Parser

# Feed Parser Service Configuration
service "feed-parser" {
  id      = "feed-parser-${env.NOMAD_ALLOC_ID}"
  name    = "feed-parser"
  tags    = ["rss", "parser", "api", "v1"]
  address = "${env.NOMAD_IP_http}"
  port    = ${env.NOMAD_PORT_http}

  check {
    http     = "http://${env.NOMAD_ADDR_http}/health"
    interval = "30s"
    timeout  = "5s"
  }

  meta {
    version     = "1.0.0"
    environment = "production"
    datacenter  = "dc1"
  }
}

# Web API Service Configuration
service "web-api" {
  id      = "web-api-${env.NOMAD_ALLOC_ID}"
  name    = "web-api"
  tags    = ["api", "web", "rest", "v1"]
  address = "${env.NOMAD_IP_http}"
  port    = ${env.NOMAD_PORT_http}

  check {
    http     = "http://${env.NOMAD_ADDR_http}/health"
    interval = "30s"
    timeout  = "5s"
  }

  check {
    http     = "http://${env.NOMAD_ADDR_http}/dashboard"
    interval = "60s"
    timeout  = "10s"
    name     = "dashboard-health"
  }

  meta {
    version     = "1.0.0"
    environment = "production"
    datacenter  = "dc1"
  }
}

# Scheduler Service Configuration
service "scheduler" {
  id      = "scheduler-${env.NOMAD_ALLOC_ID}"
  name    = "scheduler"
  tags    = ["scheduler", "cron", "background", "v1"]
  address = "${env.NOMAD_IP}"
  port    = 0  # No HTTP port for scheduler

  check {
    script   = "python /opt/feedparser/health_check.py"
    interval = "60s"
    timeout  = "10s"
  }

  meta {
    version     = "1.0.0"
    environment = "production"
    datacenter  = "dc1"
    role        = "scheduler"
  }
}

# Frontend Service Configuration  
service "frontend" {
  id      = "frontend-${env.NOMAD_ALLOC_ID}"
  name    = "frontend"
  tags    = ["frontend", "web", "react", "ui", "v1"]
  address = "${env.NOMAD_IP_http}"
  port    = ${env.NOMAD_PORT_http}

  check {
    http     = "http://${env.NOMAD_ADDR_http}/"
    interval = "30s"
    timeout  = "5s"
  }

  meta {
    version     = "1.0.0"
    environment = "production"
    datacenter  = "dc1"
  }
}