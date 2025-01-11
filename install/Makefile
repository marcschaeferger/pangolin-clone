
all: build

build:
	CGO_ENABLED=0 go build -o bin/installer

release:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o bin/installer_linux_amd64
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o bin/installer_linux_arm64

clean:
	rm bin/installer
	rm bin/installer_linux_amd64
	rm bin/installer_linux_arm64
