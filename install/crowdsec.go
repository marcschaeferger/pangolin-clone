package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strings"
	"time"
)

func installCrowdsec(config Config) error {
	// Run installation steps
	if err := backupConfig(); err != nil {
		return fmt.Errorf("backup failed: %v", err)
	}

	if err := createConfigFiles(config); err != nil {
		fmt.Printf("Error creating config files: %v\n", err)
		os.Exit(1)
	}

	if err := copyDockerService("config/crowdsec/docker-compose.yml", "docker-compose.yml", "crowdsec"); err != nil {
		fmt.Printf("Error copying docker service: %v\n", err)
		os.Exit(1)
	}

	if err := copyWebsecureEntryPoint("config/crowdsec/traefik_config.yml", "config/traefik/traefik_config.yml"); err != nil {
		fmt.Printf("Error copying entry points: %v\n", err)
		os.Exit(1)
	}

	if err := copyEntryPoints("config/traefik/traefik_config.yml", "config/crowdsec/traefik_config.yml"); err != nil {
		fmt.Printf("Error copying entry points: %v\n", err)
		os.Exit(1)
	}

	if err := moveFile("config/crowdsec/traefik_config.yml", "config/traefik/traefik_config.yml"); err != nil {
		fmt.Printf("Error moving file: %v\n", err)
		os.Exit(1)
	}

	if err := moveFile("config/crowdsec/dynamic_config.yml", "config/traefik/dynamic_config.yml"); err != nil {
		fmt.Printf("Error moving file: %v\n", err)
		os.Exit(1)
	}

	if err := os.Remove("config/crowdsec/docker-compose.yml"); err != nil {
		fmt.Printf("Error removing file: %v\n", err)
		os.Exit(1)
	}

	if err := retrieveBouncerKey(config); err != nil {
		return fmt.Errorf("bouncer key retrieval failed: %v", err)
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

func retrieveBouncerKey(config Config) error {
	// Start crowdsec container
	cmd := exec.Command("docker", "compose", "up", "-d", "crowdsec")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to start crowdsec: %v", err)
	}
	defer exec.Command("docker", "compose", "down").Run()

	// verify that the container is running if not keep waiting for 10 more seconds then return an error
	count := 0
	for {
		cmd := exec.Command("docker", "inspect", "-f", "{{.State.Running}}", "crowdsec")
		output, err := cmd.Output()
		if err != nil {
			return fmt.Errorf("failed to inspect crowdsec container: %v", err)
		}
		if strings.TrimSpace(string(output)) == "true" {
			break
		}
		time.Sleep(10 * time.Second)
		count++

		if count > 4 {
			return fmt.Errorf("crowdsec container is not running")
		}
	}

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

func checkIsCrowdsecInstalledInCompose() bool {
	// Read docker-compose.yml
	content, err := os.ReadFile("docker-compose.yml")
	if err != nil {
		return false
	}

	// Check for crowdsec service
	return bytes.Contains(content, []byte("crowdsec:"))
}
