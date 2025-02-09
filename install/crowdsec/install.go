package crowdsec

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"os/exec"
	"strings"
	"time"
)

//go:embed fs/*
var configFiles embed.FS

// Config holds all configuration values
type Config struct {
	DomainName         string
	EnrollmentKey      string
	TurnstileSiteKey   string
	TurnstileSecretKey string
	GID                string
	CrowdsecIP         string
	TraefikBouncerKey  string
	PangolinIP         string
}

// DockerContainer represents a Docker container
type DockerContainer struct {
	NetworkSettings struct {
		Networks map[string]struct {
			IPAddress string `json:"IPAddress"`
		} `json:"Networks"`
	} `json:"NetworkSettings"`
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	// Create configuration
	config := &Config{}

	// Run installation steps
	if err := backupConfig(); err != nil {
		return fmt.Errorf("backup failed: %v", err)
	}

	if err := createPangolinNetwork(); err != nil {
		return fmt.Errorf("network creation failed: %v", err)
	}

	if err := modifyDockerCompose(); err != nil {
		return fmt.Errorf("docker-compose modification failed: %v", err)
	}

	if err := createConfigFiles(*config); err != nil {
		return fmt.Errorf("config file creation failed: %v", err)
	}

	if err := retrieveIPs(config); err != nil {
		return fmt.Errorf("IP retrieval failed: %v", err)
	}

	if err := retrieveBouncerKey(config); err != nil {
		return fmt.Errorf("bouncer key retrieval failed: %v", err)
	}

	if err := replacePlaceholders(config); err != nil {
		return fmt.Errorf("placeholder replacement failed: %v", err)
	}

	if err := deployStack(); err != nil {
		return fmt.Errorf("deployment failed: %v", err)
	}

	if err := verifyDeployment(); err != nil {
		return fmt.Errorf("verification failed: %v", err)
	}

	printInstructions()
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

func createPangolinNetwork() error {
	// Check if network exists
	cmd := exec.Command("docker", "network", "inspect", "pangolin")
	if err := cmd.Run(); err == nil {
		fmt.Println("pangolin network already exists")
		return nil
	}

	// Create network
	cmd = exec.Command("docker", "network", "create", "pangolin")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to create pangolin network: %v", err)
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

func retrieveIPs(config *Config) error {
	// Start required containers
	cmd := exec.Command("docker", "compose", "up", "-d", "pangolin", "crowdsec")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to start containers: %v", err)
	}
	defer exec.Command("docker", "compose", "down").Run()

	// Wait for containers to start
	time.Sleep(10 * time.Second)

	// Get Pangolin IP
	pangolinIP, err := getContainerIP("pangolin")
	if err != nil {
		return fmt.Errorf("failed to get pangolin IP: %v", err)
	}
	config.PangolinIP = pangolinIP

	// Get CrowdSec IP
	crowdsecIP, err := getContainerIP("crowdsec")
	if err != nil {
		return fmt.Errorf("failed to get crowdsec IP: %v", err)
	}
	config.CrowdsecIP = crowdsecIP

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

func replacePlaceholders(config *Config) error {
	// Get user input
	fmt.Print("Enter your Domain Name (e.g., pangolin.example.com): ")
	fmt.Scanln(&config.DomainName)

	fmt.Print("Enter your CrowdSec Enrollment Key: ")
	fmt.Scanln(&config.EnrollmentKey)

	fmt.Print("Enter your Cloudflare Turnstile Site Key: ")
	fmt.Scanln(&config.TurnstileSiteKey)

	fmt.Print("Enter your Cloudflare Turnstile Secret Key: ")
	fmt.Scanln(&config.TurnstileSecretKey)

	fmt.Print("Enter your GID (or leave empty for default 1000): ")
	gid := ""
	fmt.Scanln(&gid)
	if gid == "" {
		config.GID = "1000"
	} else {
		config.GID = gid
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

func printInstructions() {
	fmt.Println(`
--- Testing Instructions ---
1. Test Captcha Implementation:
   docker exec crowdsec cscli decisions add --ip YOUR_IP --type captcha -d 1h
   (Replace YOUR_IP with your actual IP address)

2. Verify decisions:
   docker exec -it crowdsec cscli decisions list

3. Test security by accessing DOMAIN_NAME/.env (should return 403)
   (Replace DOMAIN_NAME with the domain you entered)

--- Troubleshooting ---
1. If encountering 403 errors:
   - Check Traefik logs: docker compose logs traefik -f
   - Verify CrowdSec logs: docker compose logs crowdsec

2. For plugin errors:
   - Verify http notifications are commented out in profiles.yaml
   - Restart services: docker compose restart traefik crowdsec

3. For Captcha issues:
   - Ensure Turnstile is configured in non-interactive mode
   - Verify captcha.html configuration
   - Check container network connectivity

Useful Commands:
- View Traefik logs: docker compose logs traefik -f
- View CrowdSec logs: docker compose logs crowdsec
- List decisions: docker exec -it crowdsec cscli decisions list
- Check metrics: curl http://localhost:6060/metrics | grep appsec
`)
}

// Helper functions

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

func getContainerIP(containerName string) (string, error) {
	output, err := exec.Command("docker", "inspect", containerName).Output()
	if err != nil {
		return "", err
	}

	var containers []DockerContainer
	if err := json.Unmarshal(output, &containers); err != nil {
		return "", err
	}

	if len(containers) == 0 {
		return "", fmt.Errorf("no container found")
	}

	for _, network := range containers[0].NetworkSettings.Networks {
		return network.IPAddress, nil
	}

	return "", fmt.Errorf("no IP address found")
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
      ENROLL_KEY: ${ENROLLMENT_KEY}
      ACQUIRE_FILES: "/var/log/traefik/*.log"
      ENROLL_TAGS: docker
    networks:
      - pangolin
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
