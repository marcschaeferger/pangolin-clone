package main

import (
	"bytes"
	"embed"
	"fmt"
	"html/template"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

//go:embed crowdsec/*
var configCrowdsecFiles embed.FS

// DockerContainer represents a Docker container
type DockerContainer struct {
	NetworkSettings struct {
		Networks map[string]struct {
			IPAddress string `json:"IPAddress"`
		} `json:"Networks"`
	} `json:"NetworkSettings"`
}

func installCrowdsec() error {
	// Create configuration
	config := &Config{}

	// Run installation steps
	if err := backupConfig(); err != nil {
		return fmt.Errorf("backup failed: %v", err)
	}

	if err := modifyDockerCompose(); err != nil {
		return fmt.Errorf("docker-compose modification failed: %v", err)
	}

	if err := createCrowdsecFiles(*config); err != nil {
		return fmt.Errorf("config file creation failed: %v", err)
	}

	moveFile("config/crowdsec/traefik_config.yaml", "config/traefik/traefik_config.yaml")
	moveFile("config/crowdsec/dynamic.yaml", "config/traefik/dynamic.yaml")

	if err := retrieveBouncerKey(config); err != nil {
		return fmt.Errorf("bouncer key retrieval failed: %v", err)
	}

	if err := deployStack(); err != nil {
		return fmt.Errorf("deployment failed: %v", err)
	}

	if err := verifyDeployment(); err != nil {
		return fmt.Errorf("verification failed: %v", err)
	}

	return nil
}

func backupConfig() error {
	// Backup docker-compose.yml
	if _, err := os.Stat("docker-compose.yml"); err == nil {
		if err := copyFile("docker-compose.yml", "docker-compose.yml.backup"); err != nil {
			return fmt.Errorf("failed to backup docker-compose.yml: %v", err)
		}
	}

	// Backup config directory
	if _, err := os.Stat("config"); err == nil {
		cmd := exec.Command("tar", "-czvf", "config.tar.gz", "config")
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to backup config directory: %v", err)
		}
	}

	return nil
}

func modifyDockerCompose() error {
	// Read existing docker-compose.yml
	content, err := os.ReadFile("docker-compose.yml")
	if err != nil {
		return fmt.Errorf("failed to read docker-compose.yml: %v", err)
	}

	// Verify required services exist
	requiredServices := []string{"services:", "pangolin:", "gerbil:", "traefik:"}
	for _, service := range requiredServices {
		if !bytes.Contains(content, []byte(service)) {
			return fmt.Errorf("required service %s not found in docker-compose.yml", service)
		}
	}

	// Add crowdsec service
	modified := addCrowdsecService(string(content))

	// Write modified content
	if err := os.WriteFile("docker-compose.yml", []byte(modified), 0644); err != nil {
		return fmt.Errorf("failed to write modified docker-compose.yml: %v", err)
	}

	return nil
}

func retrieveBouncerKey(config *Config) error {
	// Start crowdsec container
	cmd := exec.Command("docker", "compose", "up", "-d", "crowdsec")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to start crowdsec: %v", err)
	}
	defer exec.Command("docker", "compose", "down").Run()

	// Wait for container to start
	time.Sleep(10 * time.Second)

	// Get bouncer key
	output, err := exec.Command("docker", "exec", "crowdsec", "cscli", "bouncers", "add", "traefik-bouncer").Output()
	if err != nil {
		return fmt.Errorf("failed to get bouncer key: %v", err)
	}

	// Parse key from output
	lines := strings.Split(string(output), "\n")
	for _, line := range lines {
		if strings.Contains(line, "key:") {
			config.TraefikBouncerKey = strings.TrimSpace(strings.Split(line, ":")[1])
			break
		}
	}

	return nil
}

func deployStack() error {
	cmd := exec.Command("docker", "compose", "up", "-d")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to deploy stack: %v", err)
	}

	fmt.Println("Stack deployed. Waiting 2 minutes for services to initialize...")
	time.Sleep(2 * time.Minute)
	return nil
}

func verifyDeployment() error {
	resp, err := exec.Command("curl", "-s", "http://localhost:6060/metrics").Output()
	if err != nil {
		return fmt.Errorf("failed to get metrics: %v", err)
	}

	if !bytes.Contains(resp, []byte("appsec")) {
		return fmt.Errorf("appsec metrics not found in response")
	}

	return nil
}

func copyFile(src, dst string) error {
	source, err := os.Open(src)
	if err != nil {
		return err
	}
	defer source.Close()

	destination, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer destination.Close()

	_, err = io.Copy(destination, source)
	return err
}

func moveFile(src, dst string) error {
	if err := copyFile(src, dst); err != nil {
		return err
	}

	return os.Remove(src)
}

func addCrowdsecService(content string) string {
	// Implementation of adding crowdsec service to docker-compose.yml
	// This would involve string manipulation or template rendering
	// The actual implementation would depend on how you want to structure the docker-compose modifications
	return content + `
  crowdsec:
    image: crowdsecurity/crowdsec:latest
    container_name: crowdsec
    environment:
      GID: "${GID-1000}"
      COLLECTIONS: crowdsecurity/traefik crowdsecurity/appsec-virtual-patching crowdsecurity/appsec-generic-rules
      ENROLL_INSTANCE_NAME: "pangolin-crowdsec"
      PARSERS: crowdsecurity/whitelists
      ACQUIRE_FILES: "/var/log/traefik/*.log"
      ENROLL_TAGS: docker
    healthcheck:
      test: ["CMD", "cscli", "capi", "status"]
    depends_on:
      - gerbil
    labels:
      - "traefik.enable=false"
    volumes:
      - ./config/crowdsec:/etc/crowdsec
      - ./config/crowdsec/db:/var/lib/crowdsec/data
      - ./config/crowdsec_logs/auth.log:/var/log/auth.log:ro
      - ./config/crowdsec_logs/syslog:/var/log/syslog:ro
      - ./config/crowdsec_logs:/var/log
      - ./config/traefik/logs:/var/log/traefik
    ports:
      - 9090:9090
      - 6060:6060
    expose:
      - 9090
      - 6060
      - 7422
    restart: unless-stopped
    command: -t`
}

func createCrowdsecFiles(config Config) error {
	// Walk through all embedded files
	err := fs.WalkDir(configCrowdsecFiles, "crowdsec", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip the root fs directory itself
		if path == "fs" {
			return nil
		}

		// Get the relative path by removing the "fs/" prefix
		relPath := strings.TrimPrefix(path, "fs/")

		// skip .DS_Store
		if strings.Contains(relPath, ".DS_Store") {
			return nil
		}

		// Create the full output path under "config/"
		outPath := filepath.Join("config", relPath)

		if d.IsDir() {
			// Create directory
			if err := os.MkdirAll(outPath, 0755); err != nil {
				return fmt.Errorf("failed to create directory %s: %v", outPath, err)
			}
			return nil
		}

		// Read the template file
		content, err := configFiles.ReadFile(path)
		if err != nil {
			return fmt.Errorf("failed to read %s: %v", path, err)
		}

		// Parse template
		tmpl, err := template.New(d.Name()).Parse(string(content))
		if err != nil {
			return fmt.Errorf("failed to parse template %s: %v", path, err)
		}

		// Ensure parent directory exists
		if err := os.MkdirAll(filepath.Dir(outPath), 0755); err != nil {
			return fmt.Errorf("failed to create parent directory for %s: %v", outPath, err)
		}

		// Create output file
		outFile, err := os.Create(outPath)
		if err != nil {
			return fmt.Errorf("failed to create %s: %v", outPath, err)
		}
		defer outFile.Close()

		// Execute template
		if err := tmpl.Execute(outFile, config); err != nil {
			return fmt.Errorf("failed to execute template %s: %v", path, err)
		}

		return nil
	})

	if err != nil {
		return fmt.Errorf("error walking config files: %v", err)
	}

	// get the current directory
	dir, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("failed to get current directory: %v", err)
	}

	sourcePath := filepath.Join(dir, "config/docker-compose.yml")
	destPath := filepath.Join(dir, "docker-compose.yml")

	// Check if source file exists
	if _, err := os.Stat(sourcePath); err != nil {
		return fmt.Errorf("source docker-compose.yml not found: %v", err)
	}

	// Try to move the file
	err = os.Rename(sourcePath, destPath)
	if err != nil {
		return fmt.Errorf("failed to move docker-compose.yml from %s to %s: %v",
			sourcePath, destPath, err)
	}

	return nil
}
