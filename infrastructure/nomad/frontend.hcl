job "frontend" {
  datacenters = ["dc1"]
  type        = "service"
  priority    = 50

  constraint {
    attribute = "${attr.kernel.name}"
    value     = "linux"
  }

  group "web" {
    count = 2

    # Restart policy
    restart {
      attempts = 2
      interval = "10m"
      delay    = "15s"
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
        to = 3000
      }
    }

    # Service registration
    service {
      name = "frontend"
      port = "http"
      tags = [
        "frontend",
        "web",
        "react",
        "traefik.enable=true",
        "traefik.http.routers.frontend.rule=Host(`feedreader.local`)",
        "traefik.http.services.frontend.loadbalancer.server.port=3000",
        "traefik.http.routers.frontend.priority=100",
      ]

      check {
        type     = "http"
        path     = "/"
        interval = "30s"
        timeout  = "5s"
        check_restart {
          limit           = 2
          grace           = "10s"
          ignore_warnings = false
        }
      }
    }

    # Build task (runs once during deployment)
    task "build" {
      driver = "exec"

      lifecycle {
        hook = "prestart"
      }

      config {
        command = "bash"
        args    = ["build.sh"]
      }

      resources {
        cpu    = 1000
        memory = 2048
      }

      # Build script
      template {
        data = <<EOH
#!/bin/bash
set -e

echo "Installing Node.js dependencies..."
cd /local/app/services/frontend
npm install

echo "Building React application..."
export REACT_APP_API_URL="http://api.feedreader.local"
export GENERATE_SOURCEMAP=false
npm run build

echo "Build completed successfully"
EOH
        destination = "local/build.sh"
        perms       = "755"
      }

      # Application artifact
      artifact {
        source      = "git::https://github.com/your-repo/feedparser"
        destination = "local/app"
        options {
          ref = "main"
        }
      }
    }

    # Static file server task
    task "serve" {
      driver = "exec"

      config {
        command = "npx"
        args    = ["serve", "-s", "build", "-l", "${NOMAD_PORT_http}"]
      }

      # Resource allocation
      resources {
        cpu    = 300
        memory = 256
      }

      # Environment variables
      env {
        SERVE_SINGLE = "true"
      }

      # Application files (built in previous task)
      artifact {
        source      = "git::https://github.com/your-repo/feedparser"
        destination = "local/app"
        options {
          ref = "main"
        }
      }

      # Change to frontend directory
      template {
        data = <<EOH
cd /local/app/services/frontend
exec npx serve -s build -l ${NOMAD_PORT_http}
EOH
        destination = "local/start.sh"
        perms       = "755"
      }

      # Override command to use our script
      config {
        command = "bash"
        args    = ["start.sh"]
      }

      # Logs
      logs {
        max_files     = 3
        max_file_size = 10
      }
    }
  }
}