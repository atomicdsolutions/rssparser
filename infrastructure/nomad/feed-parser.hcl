job "feed-parser" {
  datacenters = ["dc1"]
  type        = "service"
  priority    = 50

  constraint {
    attribute = "${attr.kernel.name}"
    value     = "linux"
  }

  group "parser" {
    count = 2

    # Restart policy
    restart {
      attempts = 3
      interval = "10m"
      delay    = "30s"
      mode     = "fail"
    }

    # Update strategy
    update {
      max_parallel      = 1
      health_check      = "checks"
      min_healthy_time  = "30s"
      healthy_deadline  = "5m"
      progress_deadline = "10m"
      auto_revert       = true
    }

    # Network configuration
    network {
      port "http" {
        to = 8001
      }
    }

    # Service registration
    service {
      name = "feed-parser"
      port = "http"
      tags = [
        "rss",
        "parser",
        "api",
        "traefik.enable=true",
        "traefik.http.routers.feed-parser.rule=Host(`parser.feedreader.local`)",
        "traefik.http.services.feed-parser.loadbalancer.server.port=8001",
      ]

      check {
        type     = "http"
        path     = "/health"
        interval = "30s"
        timeout  = "5s"
        check_restart {
          limit           = 3
          grace           = "10s"
          ignore_warnings = false
        }
      }
    }

    # Main application task
    task "feed-parser" {
      driver = "exec"

      config {
        command = "python"
        args    = ["main.py"]
      }

      # Resource allocation
      resources {
        cpu    = 500
        memory = 512
      }

      # Environment variables
      env {
        PYTHONPATH = "${NOMAD_TASK_DIR}"
        HOST       = "0.0.0.0"
        PORT       = "${NOMAD_PORT_http}"
      }

      # Template for environment configuration
      template {
        data = <<EOH
# Supabase Configuration
SUPABASE_URL="{{ key "config/supabase/url" }}"
SUPABASE_ANON_KEY="{{ key "config/supabase/anon_key" }}"
SUPABASE_SERVICE_ROLE_KEY="{{ key "config/supabase/service_role_key" }}"

# Consul Configuration
CONSUL_HOST="{{ env "CONSUL_HTTP_ADDR" | regexReplaceAll ":[0-9]+" "" }}"
CONSUL_PORT="{{ env "CONSUL_HTTP_ADDR" | regexFind "[0-9]+$" }}"

# Application Settings
DEBUG=false
LOG_LEVEL=INFO
EOH
        destination = "secrets/app.env"
        env         = true
      }

      # Application artifact
      artifact {
        source      = "git::https://github.com/your-repo/feedparser"
        destination = "local/app"
        options {
          ref = "main"
        }
      }

      # Logs
      logs {
        max_files     = 3
        max_file_size = 10
      }
    }

    # Sidecar for metrics collection (optional)
    task "metrics" {
      driver = "exec"

      lifecycle {
        hook    = "poststart"
        sidecar = true
      }

      config {
        command = "prometheus_exporter"
        args    = ["--port", "9090", "--target", "http://localhost:${NOMAD_PORT_http}"]
      }

      resources {
        cpu    = 100
        memory = 64
      }

      service {
        name = "feed-parser-metrics"
        port = "9090"
        tags = ["metrics", "prometheus"]
      }
    }
  }
}