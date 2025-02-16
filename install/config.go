package main

import (
	"bytes"
	"fmt"
	"os"

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

type Volume string
type Port string
type Expose string

type HealthCheck struct {
	Test     []string `yaml:"test,omitempty"`
	Interval string   `yaml:"interval,omitempty"`
	Timeout  string   `yaml:"timeout,omitempty"`
	Retries  int      `yaml:"retries,omitempty"`
}

type DependsOnCondition struct {
	Condition string `yaml:"condition,omitempty"`
}

type Service struct {
	Image         string                        `yaml:"image,omitempty"`
	ContainerName string                        `yaml:"container_name,omitempty"`
	Environment   map[string]string             `yaml:"environment,omitempty"`
	HealthCheck   *HealthCheck                  `yaml:"healthcheck,omitempty"`
	DependsOn     map[string]DependsOnCondition `yaml:"depends_on,omitempty"`
	Labels        []string                      `yaml:"labels,omitempty"`
	Volumes       []Volume                      `yaml:"volumes,omitempty"`
	Ports         []Port                        `yaml:"ports,omitempty"`
	Expose        []Expose                      `yaml:"expose,omitempty"`
	Restart       string                        `yaml:"restart,omitempty"`
	Command       interface{}                   `yaml:"command,omitempty"`
	NetworkMode   string                        `yaml:"network_mode,omitempty"`
	CapAdd        []string                      `yaml:"cap_add,omitempty"`
}

type Network struct {
	Driver string `yaml:"driver,omitempty"`
	Name   string `yaml:"name,omitempty"`
}

type DockerConfig struct {
	Version  string             `yaml:"version,omitempty"`
	Services map[string]Service `yaml:"services"`
	Networks map[string]Network `yaml:"networks,omitempty"`
}

func AddCrowdSecService(configPath string) error {
	// Read existing config
	data, err := os.ReadFile(configPath)
	if err != nil {
		return err
	}

	// Parse existing config
	var config DockerConfig
	if err := yaml.Unmarshal(data, &config); err != nil {
		return err
	}

	// Create CrowdSec service
	crowdsecService := Service{
		Image:         "crowdsecurity/crowdsec:latest",
		ContainerName: "crowdsec",
		Environment: map[string]string{
			"GID":                  "1000",
			"COLLECTIONS":          "crowdsecurity/traefik crowdsecurity/appsec-virtual-patching crowdsecurity/appsec-generic-rules",
			"ENROLL_INSTANCE_NAME": "pangolin-crowdsec",
			"PARSERS":              "crowdsecurity/whitelists",
			"ACQUIRE_FILES":        "/var/log/traefik/*.log",
			"ENROLL_TAGS":          "docker",
		},
		HealthCheck: &HealthCheck{
			Test: []string{"CMD", "cscli", "capi", "status"},
		},
		DependsOn: map[string]DependsOnCondition{
			"gerbil": {},
		},
		Labels: []string{"traefik.enable=false"},
		Volumes: []Volume{
			"./config/crowdsec:/etc/crowdsec",
			"./config/crowdsec/db:/var/lib/crowdsec/data",
			"./config/crowdsec_logs/auth.log:/var/log/auth.log:ro",
			"./config/crowdsec_logs/syslog:/var/log/syslog:ro",
			"./config/crowdsec_logs:/var/log",
			"./config/traefik/logs:/var/log/traefik",
		},
		Ports: []Port{
			"9090:9090",
			"6060:6060",
		},
		Expose: []Expose{
			"9090",
			"6060",
			"7422",
		},
		Restart: "unless-stopped",
		Command: "-t",
	}

	// Add CrowdSec service to config
	if config.Services == nil {
		config.Services = make(map[string]Service)
	}
	config.Services["crowdsec"] = crowdsecService

	// Marshal config with better formatting
	yamlData, err := yaml.Marshal(&config)
	if err != nil {
		return err
	}

	// Write config back to file
	return os.WriteFile(configPath, yamlData, 0644)
}
