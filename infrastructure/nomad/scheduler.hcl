job "scheduler" {
  datacenters = ["dc1"]
  type        = "service"
  priority    = 70

  constraint {
    attribute = "${attr.kernel.name}"
    value     = "linux"
  }

  group "scheduler" {
    count = 1  # Only one scheduler instance needed

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
      health_check      = "task_states"
      min_healthy_time  = "30s"
      healthy_deadline  = "5m"
      progress_deadline = "10m"
      auto_revert       = true
    }

    # Service registration
    service {
      name = "scheduler"
      tags = [
        "scheduler",
        "cron",
        "background",
      ]

      check {
        type     = "script"
        command  = "python"
        args     = ["health_check.py"]
        interval = "60s"
        timeout  = "10s"
      }
    }

    # Main scheduler task
    task "scheduler" {
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
      }

      # Template for environment configuration
      template {
        data = <<EOH
# Supabase Configuration
SUPABASE_URL="{{ key "config/supabase/url" }}"
SUPABASE_ANON_KEY="{{ key "config/supabase/anon_key" }}"
SUPABASE_SERVICE_ROLE_KEY="{{ key "config/supabase/service_role_key" }}"

# Service URLs (using Consul DNS)
FEED_PARSER_URL="http://feed-parser.service.consul:8001"
WEB_API_URL="http://web-api.service.consul:8002"

# Consul Configuration
CONSUL_HOST="{{ env "CONSUL_HTTP_ADDR" | regexReplaceAll ":[0-9]+" "" }}"
CONSUL_PORT="{{ env "CONSUL_HTTP_ADDR" | regexFind "[0-9]+$" }}"

# Feed Processing Configuration
FEED_UPDATE_INTERVAL_MINUTES={{ key "config/scheduler/update_interval" | or "15" }}
MAX_CONCURRENT_FEEDS={{ key "config/scheduler/max_concurrent" | or "5" }}
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
        max_files     = 7
        max_file_size = 50
      }

      # Periodic task to ensure scheduler is working
      template {
        data = <<EOH
#!/bin/bash
# Health check script
python -c "
import sys
import requests
try:
    # Check if scheduler process is responding
    response = requests.get('http://web-api.service.consul:8002/health', timeout=5)
    sys.exit(0 if response.status_code == 200 else 1)
except:
    sys.exit(1)
"
EOH
        destination = "local/health_check.py"
        perms       = "755"
      }
    }
  }
}