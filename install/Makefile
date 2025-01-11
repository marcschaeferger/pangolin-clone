
all: build

build: 
	CGO_ENABLED=0 GOOS=linux go build -o installer

all_arches:
	CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -o installer_linux_arm64
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o installer_linux_amd64

clean:
	rm installer