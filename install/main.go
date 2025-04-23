package main

import (
	"bufio"
	"bytes"
	"embed"
	"fmt"
	"io"
	"io/fs"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"syscall"
	"text/template"
	"time"
	"unicode"

	"golang.org/x/term"
)

// DO NOT EDIT THIS FUNCTION; IT MATCHED BY REGEX IN CICD
func loadVersions(config *Config) {
	config.PangolinVersion = "replaceme"
	config.GerbilVersion = "replaceme"
	config.BadgerVersion = "replaceme"
}

//go:embed config/*
var configFiles embed.FS

type Config struct {
	PangolinVersion            string
	GerbilVersion              string
	BadgerVersion              string
	BaseDomain                 string
	DashboardDomain            string
	LetsEncryptEmail           string
	AdminUserEmail             string
	AdminUserPassword          string
	DisableSignupWithoutInvite bool
	DisableUserCreateOrg       bool
	EnableEmail                bool
	EmailSMTPHost              string
	EmailSMTPPort              int
	EmailSMTPUser              string
	EmailSMTPPass              string
	EmailNoReply               string
	InstallGerbil              bool
	TraefikBouncerKey          string
	DoCrowdsecInstall          bool
}

func main() {
	reader := bufio.NewReader(os.Stdin)

	// check if the user is root
	if os.Geteuid() != 0 {
		fmt.Println("This script must be run as root")
		os.Exit(1)
	}

	var config Config
	config.DoCrowdsecInstall = false

	// check if there is already a config file
	if _, err := os.Stat("config/config.yml"); err != nil {
		config = collectUserInput(reader)

		loadVersions(&config)

		if err := createConfigFiles(config); err != nil {
			fmt.Printf("Error creating config files: %v\n", err)
			os.Exit(1)
		}

		moveFile("config/docker-compose.yml", "docker-compose.yml")

		if !isDockerInstalled() && runtime.GOOS == "linux" {
			if readBool(reader, "Docker is not installed. Would you like to install it?", true) {
				installDocker()
			}
		}

		fmt.Println("\n=== Starting installation ===")

		if isDockerInstalled() {
			if readBool(reader, "Would you like to install and start the containers?", true) {
				if err := pullContainers(); err != nil {
					fmt.Println("Error: ", err)
					return
				}

				if err := startContainers(); err != nil {
					fmt.Println("Error: ", err)
					return
				}
			}
		}
	} else {
		fmt.Println("Looks like you already installed, so I am going to do the setup...")
	}

	if !checkIsCrowdsecInstalledInCompose() {
		fmt.Println("\n=== CrowdSec Install ===")
		// check if crowdsec is installed
		if readBool(reader, "Would you like to install CrowdSec?", false) {
			fmt.Println("This installer constitutes a minimal viable CrowdSec deployment. CrowdSec will add extra complexity to your Pangolin installation and may not work to the best of its abilities out of the box. Users are expected to implement configuration adjustments on their own to achieve the best security posture. Consult the CrowdSec documentation for detailed configuration instructions.")
			if readBool(reader, "Are you willing to manage CrowdSec?", false) {
				if config.DashboardDomain == "" {
					traefikConfig, err := ReadTraefikConfig("config/traefik/traefik_config.yml", "config/traefik/dynamic_config.yml")
					if err != nil {
						fmt.Printf("Error reading config: %v\n", err)
						return
					}
					config.DashboardDomain = traefikConfig.DashboardDomain
					config.LetsEncryptEmail = traefikConfig.LetsEncryptEmail
					config.BadgerVersion = traefikConfig.BadgerVersion

					// print the values and check if they are right
					fmt.Println("Detected values:")
					fmt.Printf("Dashboard Domain: %s\n", config.DashboardDomain)
					fmt.Printf("Let's Encrypt Email: %s\n", config.LetsEncryptEmail)
					fmt.Printf("Badger Version: %s\n", config.BadgerVersion)

					if !readBool(reader, "Are these values correct?", true) {
						config = collectUserInput(reader)
					}
				}

				config.DoCrowdsecInstall = true
				installCrowdsec(config)
			}
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

func readPassword(prompt string, reader *bufio.Reader) string {
	if term.IsTerminal(int(syscall.Stdin)) {
		fmt.Print(prompt + ": ")
		// Read password without echo if we're in a terminal
		password, err := term.ReadPassword(int(syscall.Stdin))
		fmt.Println() // Add a newline since ReadPassword doesn't add one
		if err != nil {
			return ""
		}
		input := strings.TrimSpace(string(password))
		if input == "" {
			return readPassword(prompt, reader)
		}
		return input
	} else {
		// Fallback to reading from stdin if not in a terminal
		return readString(reader, prompt, "")
	}
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
	config.BaseDomain = readString(reader, "Enter your base domain (no subdomain e.g. example.com)", "")
	config.DashboardDomain = readString(reader, "Enter the domain for the Pangolin dashboard", "pangolin."+config.BaseDomain)
	config.LetsEncryptEmail = readString(reader, "Enter email for Let's Encrypt certificates", "")
	config.InstallGerbil = readBool(reader, "Do you want to use Gerbil to allow tunned connections", true)

	// Admin user configuration
	fmt.Println("\n=== Admin User Configuration ===")
	config.AdminUserEmail = readString(reader, "Enter admin user email", "admin@"+config.BaseDomain)
	for {
		pass1 := readPassword("Create admin user password", reader)
		pass2 := readPassword("Confirm admin user password", reader)

		if pass1 != pass2 {
			fmt.Println("Passwords do not match")
		} else {
			config.AdminUserPassword = pass1
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
	}

	// Security settings
	fmt.Println("\n=== Security Settings ===")
	config.DisableSignupWithoutInvite = readBool(reader, "Disable signup without invite", true)
	config.DisableUserCreateOrg = readBool(reader, "Disable users from creating organizations", false)

	// Email configuration
	fmt.Println("\n=== Email Configuration ===")
	config.EnableEmail = readBool(reader, "Enable email functionality", false)

	if config.EnableEmail {
		config.EmailSMTPHost = readString(reader, "Enter SMTP host", "")
		config.EmailSMTPPort = readInt(reader, "Enter SMTP port (default 587)", 587)
		config.EmailSMTPUser = readString(reader, "Enter SMTP username", "")
		config.EmailSMTPPass = readString(reader, "Enter SMTP password", "")
		config.EmailNoReply = readString(reader, "Enter no-reply email address", "")
	}

	// Validate required fields
	if config.BaseDomain == "" {
		fmt.Println("Error: Domain name is required")
		os.Exit(1)
	}
	if config.DashboardDomain == "" {
		fmt.Println("Error: Dashboard Domain name is required")
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
	err := fs.WalkDir(configFiles, "config", func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}

		// Skip the root fs directory itself
		if path == "config" {
			return nil
		}

		if !config.DoCrowdsecInstall && strings.Contains(path, "crowdsec") {
			return nil
		}

		if config.DoCrowdsecInstall && !strings.Contains(path, "crowdsec") {
			return nil
		}

		// skip .DS_Store
		if strings.Contains(path, ".DS_Store") {
			return nil
		}

		if d.IsDir() {
			// Create directory
			if err := os.MkdirAll(path, 0755); err != nil {
				return fmt.Errorf("failed to create directory %s: %v", path, err)
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
		if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
			return fmt.Errorf("failed to create parent directory for %s: %v", path, err)
		}

		// Create output file
		outFile, err := os.Create(path)
		if err != nil {
			return fmt.Errorf("failed to create %s: %v", path, err)
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

	return nil
}

func installDocker() error {
	// Detect Linux distribution
	cmd := exec.Command("cat", "/etc/os-release")
	output, err := cmd.Output()
	if err != nil {
		return fmt.Errorf("failed to detect Linux distribution: %v", err)
	}
	osRelease := string(output)

	// Detect system architecture
	archCmd := exec.Command("uname", "-m")
	archOutput, err := archCmd.Output()
	if err != nil {
		return fmt.Errorf("failed to detect system architecture: %v", err)
	}
	arch := strings.TrimSpace(string(archOutput))

	// Map architecture to Docker's architecture naming
	var dockerArch string
	switch arch {
	case "x86_64":
		dockerArch = "amd64"
	case "aarch64":
		dockerArch = "arm64"
	default:
		return fmt.Errorf("unsupported architecture: %s", arch)
	}

	var installCmd *exec.Cmd
	switch {
	case strings.Contains(osRelease, "ID=ubuntu"):
		installCmd = exec.Command("bash", "-c", fmt.Sprintf(`
			apt-get update &&
			apt-get install -y apt-transport-https ca-certificates curl software-properties-common &&
			curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg &&
			echo "deb [arch=%s signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list &&
			apt-get update &&
			apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
		`, dockerArch))
	case strings.Contains(osRelease, "ID=debian"):
		installCmd = exec.Command("bash", "-c", fmt.Sprintf(`
			apt-get update &&
			apt-get install -y apt-transport-https ca-certificates curl software-properties-common &&
			curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg &&
			echo "deb [arch=%s signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" > /etc/apt/sources.list.d/docker.list &&
			apt-get update &&
			apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
		`, dockerArch))
	case strings.Contains(osRelease, "ID=fedora"):
		installCmd = exec.Command("bash", "-c", `
			dnf -y install dnf-plugins-core &&
			dnf config-manager --add-repo https://download.docker.com/linux/fedora/docker-ce.repo &&
			dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
		`)
	case strings.Contains(osRelease, "ID=opensuse") || strings.Contains(osRelease, "ID=\"opensuse-"):
		installCmd = exec.Command("bash", "-c", `
			zypper install -y docker docker-compose &&
			systemctl enable docker
		`)
	case strings.Contains(osRelease, "ID=rhel") || strings.Contains(osRelease, "ID=\"rhel"):
		installCmd = exec.Command("bash", "-c", `
			dnf remove -y runc &&
			dnf -y install yum-utils &&
			dnf config-manager --add-repo https://download.docker.com/linux/rhel/docker-ce.repo &&
			dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin &&
			systemctl enable docker
		`)
	case strings.Contains(osRelease, "ID=amzn"):
		installCmd = exec.Command("bash", "-c", `
			yum update -y &&
			yum install -y docker &&
			systemctl enable docker &&
			usermod -a -G docker ec2-user
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

// executeDockerComposeCommandWithArgs executes the appropriate docker command with arguments supplied
func executeDockerComposeCommandWithArgs(args ...string) error {
	var cmd *exec.Cmd
	var useNewStyle bool

	if !isDockerInstalled() {
		return fmt.Errorf("docker is not installed")
	}

	checkCmd := exec.Command("docker", "compose", "version")
	if err := checkCmd.Run(); err == nil {
		useNewStyle = true
	} else {
		checkCmd = exec.Command("docker-compose", "version")
		if err := checkCmd.Run(); err == nil {
			useNewStyle = false
		} else {
			return fmt.Errorf("neither 'docker compose' nor 'docker-compose' command is available")
		}
	}
	
	if useNewStyle {
		cmd = exec.Command("docker", append([]string{"compose"}, args...)...)
	} else {
		cmd = exec.Command("docker-compose", args...)
	}

    cmd.Stdout = os.Stdout
    cmd.Stderr = os.Stderr
    return cmd.Run()
}

// pullContainers pulls the containers using the appropriate command.
func pullContainers() error {
	fmt.Println("Pulling the container images...")

	if err := executeDockerComposeCommandWithArgs("-f", "docker-compose.yml", "pull", "--policy", "always"); err != nil {
		return fmt.Errorf("failed to pull the containers: %v", err)
	}

	return nil
}

// startContainers starts the containers using the appropriate command.
func startContainers() error {
	fmt.Println("Starting containers...")
	if err := executeDockerComposeCommandWithArgs("-f", "docker-compose.yml", "up", "-d", "--force-recreate"); err != nil {
		return fmt.Errorf("failed to start containers: %v", err)
	}

	return nil
}

// stopContainers stops the containers using the appropriate command.
func stopContainers() error {
	fmt.Println("Stopping containers...")
	
	if err := executeDockerComposeCommandWithArgs("-f", "docker-compose.yml", "down"); err != nil {
		return fmt.Errorf("failed to stop containers: %v", err)
	}

	return nil
}

// restartContainer restarts a specific container using the appropriate command.
func restartContainer(container string) error {
	fmt.Println("Restarting containers...")
	
	 if err := executeDockerComposeCommandWithArgs("-f", "docker-compose.yml", "restart", container); err != nil {
		return fmt.Errorf("failed to stop the container \"%s\": %v", container, err)
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

func waitForContainer(containerName string) error {
	maxAttempts := 30
	retryInterval := time.Second * 2

	for attempt := 0; attempt < maxAttempts; attempt++ {
		// Check if container is running
		cmd := exec.Command("docker", "container", "inspect", "-f", "{{.State.Running}}", containerName)
		var out bytes.Buffer
		cmd.Stdout = &out

		if err := cmd.Run(); err != nil {
			// If the container doesn't exist or there's another error, wait and retry
			time.Sleep(retryInterval)
			continue
		}

		isRunning := strings.TrimSpace(out.String()) == "true"
		if isRunning {
			return nil
		}

		// Container exists but isn't running yet, wait and retry
		time.Sleep(retryInterval)
	}

	return fmt.Errorf("container %s did not start within %v seconds", containerName, maxAttempts*int(retryInterval.Seconds()))
}
