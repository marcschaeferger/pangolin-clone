package main

import (
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"strings"

	"gopkg.in/yaml.v3"
)

// TraefikConfig represents the structure of the main Traefik configuration
type TraefikConfig struct {
	Experimental struct {
		Plugins struct {
			Badger struct {
				Version string `yaml:"version"`
			} `yaml:"badger"`
		} `yaml:"plugins"`
	} `yaml:"experimental"`
	CertificatesResolvers struct {
		LetsEncrypt struct {
			Acme struct {
				Email string `yaml:"email"`
			} `yaml:"acme"`
		} `yaml:"letsencrypt"`
	} `yaml:"certificatesResolvers"`
}

// DynamicConfig represents the structure of the dynamic configuration
type DynamicConfig struct {
	HTTP struct {
		Routers map[string]struct {
			Rule string `yaml:"rule"`
		} `yaml:"routers"`
	} `yaml:"http"`
}

// ConfigValues holds the extracted configuration values
type ConfigValues struct {
	DashboardDomain  string
	LetsEncryptEmail string
	BadgerVersion    string
}

// ReadTraefikConfig reads and extracts values from Traefik configuration files
func ReadTraefikConfig(mainConfigPath, dynamicConfigPath string) (*ConfigValues, error) {
	// Read main config file
	mainConfigData, err := os.ReadFile(mainConfigPath)
	if err != nil {
		return nil, fmt.Errorf("error reading main config file: %w", err)
	}

	var mainConfig TraefikConfig
	if err := yaml.Unmarshal(mainConfigData, &mainConfig); err != nil {
		return nil, fmt.Errorf("error parsing main config file: %w", err)
	}

	// Read dynamic config file
	dynamicConfigData, err := os.ReadFile(dynamicConfigPath)
	if err != nil {
		return nil, fmt.Errorf("error reading dynamic config file: %w", err)
	}

	var dynamicConfig DynamicConfig
	if err := yaml.Unmarshal(dynamicConfigData, &dynamicConfig); err != nil {
		return nil, fmt.Errorf("error parsing dynamic config file: %w", err)
	}

	// Extract values
	values := &ConfigValues{
		BadgerVersion:    mainConfig.Experimental.Plugins.Badger.Version,
		LetsEncryptEmail: mainConfig.CertificatesResolvers.LetsEncrypt.Acme.Email,
	}

	// Extract DashboardDomain from router rules
	// Look for it in the main router rules
	for _, router := range dynamicConfig.HTTP.Routers {
		if router.Rule != "" {
			// Extract domain from Host(`mydomain.com`)
			if domain := extractDomainFromRule(router.Rule); domain != "" {
				values.DashboardDomain = domain
				break
			}
		}
	}

	return values, nil
}

// extractDomainFromRule extracts the domain from a router rule
func extractDomainFromRule(rule string) string {
	// Look for the Host(`mydomain.com`) pattern
	if start := findPattern(rule, "Host(`"); start != -1 {
		end := findPattern(rule[start:], "`)")
		if end != -1 {
			return rule[start+6 : start+end]
		}
	}
	return ""
}

// findPattern finds the start of a pattern in a string
func findPattern(s, pattern string) int {
	return bytes.Index([]byte(s), []byte(pattern))
}

func copyEntryPoints(sourceFile, destFile string) error {
	// Read source file
	sourceData, err := os.ReadFile(sourceFile)
	if err != nil {
		return fmt.Errorf("error reading source file: %w", err)
	}

	// Read destination file
	destData, err := os.ReadFile(destFile)
	if err != nil {
		return fmt.Errorf("error reading destination file: %w", err)
	}

	// Parse source YAML
	var sourceYAML map[string]interface{}
	if err := yaml.Unmarshal(sourceData, &sourceYAML); err != nil {
		return fmt.Errorf("error parsing source YAML: %w", err)
	}

	// Parse destination YAML
	var destYAML map[string]interface{}
	if err := yaml.Unmarshal(destData, &destYAML); err != nil {
		return fmt.Errorf("error parsing destination YAML: %w", err)
	}

	// Get entryPoints section from source
	entryPoints, ok := sourceYAML["entryPoints"]
	if !ok {
		return fmt.Errorf("entryPoints section not found in source file")
	}

	// Update entryPoints in destination
	destYAML["entryPoints"] = entryPoints

	// Marshal updated destination YAML
	// updatedData, err := yaml.Marshal(destYAML)
	updatedData, err := MarshalYAMLWithIndent(destYAML, 2)
	if err != nil {
		return fmt.Errorf("error marshaling updated YAML: %w", err)
	}

	// Write updated YAML back to destination file
	if err := os.WriteFile(destFile, updatedData, 0644); err != nil {
		return fmt.Errorf("error writing to destination file: %w", err)
	}

	return nil
}

func copyWebsecureEntryPoint(sourceFile, destFile string) error {
	// Read source file
	sourceData, err := os.ReadFile(sourceFile)
	if err != nil {
		return fmt.Errorf("error reading source file: %w", err)
	}

	// Read destination file
	destData, err := os.ReadFile(destFile)
	if err != nil {
		return fmt.Errorf("error reading destination file: %w", err)
	}

	// Parse source YAML
	var sourceYAML map[string]interface{}
	if err := yaml.Unmarshal(sourceData, &sourceYAML); err != nil {
		return fmt.Errorf("error parsing source YAML: %w", err)
	}

	// Parse destination YAML
	var destYAML map[string]interface{}
	if err := yaml.Unmarshal(destData, &destYAML); err != nil {
		return fmt.Errorf("error parsing destination YAML: %w", err)
	}

	// Get entryPoints section from source
	entryPoints, ok := sourceYAML["entryPoints"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("entryPoints section not found in source file or has invalid format")
	}

	// Get websecure configuration
	websecure, ok := entryPoints["websecure"]
	if !ok {
		return fmt.Errorf("websecure entrypoint not found in source file")
	}

	// Get or create entryPoints section in destination
	destEntryPoints, ok := destYAML["entryPoints"].(map[string]interface{})
	if !ok {
		// If entryPoints section doesn't exist, create it
		destEntryPoints = make(map[string]interface{})
		destYAML["entryPoints"] = destEntryPoints
	}

	// Update websecure in destination
	destEntryPoints["websecure"] = websecure

	// Marshal updated destination YAML
	// updatedData, err := yaml.Marshal(destYAML)
	updatedData, err := MarshalYAMLWithIndent(destYAML, 2)
	if err != nil {
		return fmt.Errorf("error marshaling updated YAML: %w", err)
	}

	// Write updated YAML back to destination file
	if err := os.WriteFile(destFile, updatedData, 0644); err != nil {
		return fmt.Errorf("error writing to destination file: %w", err)
	}

	return nil
}

func copyDockerService(sourceFile, destFile, serviceName string) error {
	// Read source file
	sourceData, err := os.ReadFile(sourceFile)
	if err != nil {
		return fmt.Errorf("error reading source file: %w", err)
	}

	// Read destination file
	destData, err := os.ReadFile(destFile)
	if err != nil {
		return fmt.Errorf("error reading destination file: %w", err)
	}

	// Parse source Docker Compose YAML
	var sourceCompose map[string]interface{}
	if err := yaml.Unmarshal(sourceData, &sourceCompose); err != nil {
		return fmt.Errorf("error parsing source Docker Compose file: %w", err)
	}

	// Parse destination Docker Compose YAML
	var destCompose map[string]interface{}
	if err := yaml.Unmarshal(destData, &destCompose); err != nil {
		return fmt.Errorf("error parsing destination Docker Compose file: %w", err)
	}

	// Get services section from source
	sourceServices, ok := sourceCompose["services"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("services section not found in source file or has invalid format")
	}

	// Get the specific service configuration
	serviceConfig, ok := sourceServices[serviceName]
	if !ok {
		return fmt.Errorf("service '%s' not found in source file", serviceName)
	}

	// Get or create services section in destination
	destServices, ok := destCompose["services"].(map[string]interface{})
	if !ok {
		// If services section doesn't exist, create it
		destServices = make(map[string]interface{})
		destCompose["services"] = destServices
	}

	// Update service in destination
	destServices[serviceName] = serviceConfig

	// Marshal updated destination YAML
	// Use yaml.v3 encoder to preserve formatting and comments
	// updatedData, err := yaml.Marshal(destCompose)
	updatedData, err := MarshalYAMLWithIndent(destCompose, 2)
	if err != nil {
		return fmt.Errorf("error marshaling updated Docker Compose file: %w", err)
	}

	// Write updated YAML back to destination file
	if err := os.WriteFile(destFile, updatedData, 0644); err != nil {
		return fmt.Errorf("error writing to destination file: %w", err)
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

func MarshalYAMLWithIndent(data interface{}, indent int) ([]byte, error) {
	buffer := new(bytes.Buffer)
	encoder := yaml.NewEncoder(buffer)
	encoder.SetIndent(indent)

	err := encoder.Encode(data)
	if err != nil {
		return nil, err
	}

	defer encoder.Close()
	return buffer.Bytes(), nil
}

func replaceInFile(filepath, oldStr, newStr string) error {
	// Read the file content
	content, err := os.ReadFile(filepath)
	if err != nil {
		return fmt.Errorf("error reading file: %v", err)
	}

	// Replace the string
	newContent := strings.Replace(string(content), oldStr, newStr, -1)

	// Write the modified content back to the file
	err = os.WriteFile(filepath, []byte(newContent), 0644)
	if err != nil {
		return fmt.Errorf("error writing file: %v", err)
	}

	return nil
}

func CheckAndAddTraefikLogVolume(composePath string) error {
	// Read the docker-compose.yml file
	data, err := os.ReadFile(composePath)
	if err != nil {
		return fmt.Errorf("error reading compose file: %w", err)
	}

	// Parse YAML into a generic map
	var compose map[string]interface{}
	if err := yaml.Unmarshal(data, &compose); err != nil {
		return fmt.Errorf("error parsing compose file: %w", err)
	}

	// Get services section
	services, ok := compose["services"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("services section not found or invalid")
	}

	// Get traefik service
	traefik, ok := services["traefik"].(map[string]interface{})
	if !ok {
		return fmt.Errorf("traefik service not found or invalid")
	}

	// Check volumes
	logVolume := "./config/traefik/logs:/var/log/traefik"
	var volumes []interface{}

	if existingVolumes, ok := traefik["volumes"].([]interface{}); ok {
		// Check if volume already exists
		for _, v := range existingVolumes {
			if v.(string) == logVolume {
				fmt.Println("Traefik log volume is already configured")
				return nil
			}
		}
		volumes = existingVolumes
	}

	// Add new volume
	volumes = append(volumes, logVolume)
	traefik["volumes"] = volumes

	// Write updated config back to file
	newData, err := MarshalYAMLWithIndent(compose, 2)
	if err != nil {
		return fmt.Errorf("error marshaling updated compose file: %w", err)
	}

	if err := os.WriteFile(composePath, newData, 0644); err != nil {
		return fmt.Errorf("error writing updated compose file: %w", err)
	}

	fmt.Println("Added traefik log volume and created logs directory")
	return nil
}
