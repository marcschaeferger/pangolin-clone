package main

import (
	"bufio"
	"embed"
	"fmt"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"text/template"
	"unicode"
)

//go:embed fs/*
var configFiles embed.FS

type Config struct {
	Domain                     string `yaml:"domain"`
	LetsEncryptEmail           string `yaml:"letsEncryptEmail"`
	AdminUserEmail             string `yaml:"adminUserEmail"`
	AdminUserPassword          string `yaml:"adminUserPassword"`
	DisableSignupWithoutInvite bool   `yaml:"disableSignupWithoutInvite"`
	DisableUserCreateOrg       bool   `yaml:"disableUserCreateOrg"`
	EnableEmail                bool   `yaml:"enableEmail"`
	EmailSMTPHost              string `yaml:"emailSMTPHost"`
	EmailSMTPPort              int    `yaml:"emailSMTPPort"`
	EmailSMTPUser              string `yaml:"emailSMTPUser"`
	EmailSMTPPass              string `yaml:"emailSMTPPass"`
	EmailNoReply               string `yaml:"emailNoReply"`
}

func main() {
	reader := bufio.NewReader(os.Stdin)

	config := collectUserInput(reader)
	createConfigFiles(config)

	if !isDockerInstalled() && runtime.GOOS == "linux" {
		if shouldInstallDocker() {
			// ask user if they want to install docker
			if readBool(reader, "Would you like to install Docker?", true) {
				installDocker()
			}
		}
	}

	if isDockerInstalled() {
		if readBool(reader, "Would you like to install and start the containers?", true) {
			pullAndStartContainers()
		}
	}

	fmt.Println("Installation complete!")
}

func readString(reader *bufio.Reader, prompt string, defaultValue string) string {
	if defaultValue != "" {
		fmt.Printf("%s (default: %s): ", prompt, defaultValue)
	} else {
		fmt.Print(prompt + ": ")
	}
	input, _ := reader.ReadString('\n')
	input = strings.TrimSpace(input)
	if input == "" {
		return defaultValue
	}
	return input
}

func readBool(reader *bufio.Reader, prompt string, defaultValue bool) bool {
	defaultStr := "no"
	if defaultValue {
		defaultStr = "yes"
	}
	input := readString(reader, prompt+" (yes/no)", defaultStr)
	return strings.ToLower(input) == "yes"
}

func readInt(reader *bufio.Reader, prompt string, defaultValue int) int {
	input := readString(reader, prompt, fmt.Sprintf("%d", defaultValue))
	if input == "" {
		return defaultValue
	}
	value := defaultValue
	fmt.Sscanf(input, "%d", &value)
	return value
}

func collectUserInput(reader *bufio.Reader) Config {
	config := Config{}

	// Basic configuration
	fmt.Println("\n=== Basic Configuration ===")
	config.Domain = readString(reader, "Enter your domain name", "")
	config.LetsEncryptEmail = readString(reader, "Enter email for Let's Encrypt certificates", "")

	// Admin user configuration
	fmt.Println("\n=== Admin User Configuration ===")
	config.AdminUserEmail = readString(reader, "Enter admin user email", "admin@"+config.Domain)
	for {
		config.AdminUserPassword = readString(reader, "Enter admin user password", "")
		if valid, message := validatePassword(config.AdminUserPassword); valid {
			break
		} else {
			fmt.Println("Invalid password:", message)
			fmt.Println("Password requirements:")
			fmt.Println("- At least one uppercase English letter")
			fmt.Println("- At least one lowercase English letter")
			fmt.Println("- At least one digit")
			fmt.Println("- At least one special character")
		}
	}

	// Security settings
	fmt.Println("\n=== Security Settings ===")
	config.DisableSignupWithoutInvite = readBool(reader, "Disable signup without invite", true)
	config.DisableUserCreateOrg = readBool(reader, "Disable users from creating organizations", false)

	// Email configuration
	fmt.Println("\n=== Email Configuration ===")
	config.EnableEmail = readBool(reader, "Enable email functionality", false)

	if config.EnableEmail {
		config.EmailSMTPHost = readString(reader, "Enter SMTP host: ", "")
		config.EmailSMTPPort = readInt(reader, "Enter SMTP port (default 587): ", 587)
		config.EmailSMTPUser = readString(reader, "Enter SMTP username: ", "")
		config.EmailSMTPPass = readString(reader, "Enter SMTP password: ", "")
		config.EmailNoReply = readString(reader, "Enter no-reply email address: ", "")
	}

	// Validate required fields
	if config.Domain == "" {
		fmt.Println("Error: Domain name is required")
		os.Exit(1)
	}
	if config.LetsEncryptEmail == "" {
		fmt.Println("Error: Let's Encrypt email is required")
		os.Exit(1)
	}
	if config.AdminUserEmail == "" || config.AdminUserPassword == "" {
		fmt.Println("Error: Admin user email and password are required")
		os.Exit(1)
	}

	return config
}

func validatePassword(password string) (bool, string) {
	if len(password) == 0 {
		return false, "Password cannot be empty"
	}

	var (
		hasUpper   bool
		hasLower   bool
		hasDigit   bool
		hasSpecial bool
	)

	for _, char := range password {
		switch {
		case unicode.IsUpper(char):
			hasUpper = true
		case unicode.IsLower(char):
			hasLower = true
		case unicode.IsDigit(char):
			hasDigit = true
		case unicode.IsPunct(char) || unicode.IsSymbol(char):
			hasSpecial = true
		}
	}

	var missing []string
	if !hasUpper {
		missing = append(missing, "an uppercase letter")
	}
	if !hasLower {
		missing = append(missing, "a lowercase letter")
	}
	if !hasDigit {
		missing = append(missing, "a digit")
	}
	if !hasSpecial {
		missing = append(missing, "a special character")
	}

	if len(missing) > 0 {
		return false, fmt.Sprintf("Password must contain %s", strings.Join(missing, ", "))
	}

	return true, ""
}

func createConfigFiles(config Config) error {
	os.MkdirAll("config", 0755)
	os.MkdirAll("config/letsencrypt", 0755)
	os.MkdirAll("config/db", 0755)
	os.MkdirAll("config/logs", 0755)

	// Walk through all embedded files
	err := fs.WalkDir(configFiles, "fs", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip the root fs directory itself
		if path == "fs" {
			return nil
		}

		// Get the relative path by removing the "fs/" prefix
		relPath := strings.TrimPrefix(path, "fs/")

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

	// move the docker-compose.yml file to the root directory
	os.Rename("config/docker-compose.yml", "docker-compose.yml")

	return nil
}

func shouldInstallDocker() bool {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Would you like to install Docker? (yes/no): ")
	response, _ := reader.ReadString('\n')
	return strings.ToLower(strings.TrimSpace(response)) == "yes"
}

func installDocker() error {
	// Detect Linux distribution
	cmd := exec.Command("cat", "/etc/os-release")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to detect Linux distribution: %v", err)
	}

	osRelease := string(output)
	var installCmd *exec.Cmd

	switch {
	case strings.Contains(osRelease, "ID=ubuntu") || strings.Contains(osRelease, "ID=debian"):
		installCmd = exec.Command("bash", "-c", `
            apt-get update && 
            apt-get install -y apt-transport-https ca-certificates curl software-properties-common &&
            curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg &&
            echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list &&
            apt-get update &&
            apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        `)
	case strings.Contains(osRelease, "ID=fedora"):
		installCmd = exec.Command("bash", "-c", `
            dnf -y install dnf-plugins-core &&
            dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo &&
            dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
        `)
	default:
		return fmt.Errorf("unsupported Linux distribution")
	}

	installCmd.Stdout = os.Stdout
	installCmd.Stderr = os.Stderr
	return installCmd.Run()
}

func isDockerInstalled() bool {
	cmd := exec.Command("docker", "--version")
	if err := cmd.Run(); err != nil {
		return false
	}
	return true
}

func pullAndStartContainers() error {
	containers := []string{
		"traefik:v3.1",
		"fossorial/pangolin:latest",
		"fossorial/gerbil:latest",
	}

	for _, container := range containers {
		fmt.Printf("Pulling %s...\n", container)
		cmd := exec.Command("docker", "pull", container)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to pull %s: %v", container, err)
		}
	}

	fmt.Println("Starting containers...")

	// First try docker compose (new style)
	cmd := exec.Command("docker", "compose", "-f", "docker-compose.yml", "up", "-d")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	err := cmd.Run()

	// If docker compose fails, try docker-compose (legacy style)
	if err != nil {
		cmd = exec.Command("docker-compose", "-f", "docker-compose.yml", "up", "-d")
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr
		err = cmd.Run()
	}

	return err
}
