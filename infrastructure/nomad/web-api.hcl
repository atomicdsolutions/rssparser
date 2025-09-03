job "web-api" {
  datacenters = ["dc1"]
  type        = "service"
  priority    = 60

  constraint {
    attribute = "${attr.kernel.name}"
    value     = "linux"
  }

  group "api" {
    count = 3

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
        to = 8002
      }
    }

    # Service registration
    service {
      name = "web-api"
      port = "http"
      tags = [
        "api",
        "web",
        "rest",
        "traefik.enable=true",
        "traefik.http.routers.web-api.rule=Host(`api.feedreader.local`)",
        "traefik.http.services.web-api.loadbalancer.server.port=8002",
        "traefik.http.routers.web-api.middlewares=cors-headers",
        "traefik.http.middlewares.cors-headers.headers.accesscontrolallowmethods=GET,OPTIONS,PUT,POST,DELETE",
        "traefik.http.middlewares.cors-headers.headers.accesscontrolallowheaders=*",
        "traefik.http.middlewares.cors-headers.headers.accesscontrolalloworiginlist=*",
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
    task "web-api" {
      driver = "exec"

      config {
        command = "python"
        args    = ["main.py"]
      }

      # Resource allocation
      resources {
        cpu    = 1000
        memory = 1024
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

# Service URLs
FEED_PARSER_URL="http://feed-parser.service.consul:8001"
FRONTEND_URL="http://frontend.service.consul:3000"

# Consul Configuration
CONSUL_HOST="{{ env "CONSUL_HTTP_ADDR" | regexReplaceAll ":[0-9]+" "" }}"
CONSUL_PORT="{{ env "CONSUL_HTTP_ADDR" | regexFind "[0-9]+$" }}"

# Feed Processing Configuration
FEED_UPDATE_INTERVAL_MINUTES=15
MAX_FEED_ITEMS_PER_BATCH=100

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
        max_files     = 5
        max_file_size = 20
      }
    }

    # Database migration task (runs once)
    task "migrate" {
      driver = "exec"

      lifecycle {
        hook = "prestart"
      }

      config {
        command = "python"
        args    = ["migrate.py"]
      }

      resources {
        cpu    = 200
        memory = 256
      }

      # Same environment as main app
      template {
        data = <<EOH
SUPABASE_URL="{{ key "config/supabase/url" }}"
SUPABASE_SERVICE_ROLE_KEY="{{ key "config/supabase/service_role_key" }}"
EOH
        destination = "secrets/migrate.env"
        env         = true
      }

      artifact {
        source      = "git::https://github.com/your-repo/feedparser"
        destination = "local/app"
        options {
          ref = "main"
        }
      }
    }
  }
}