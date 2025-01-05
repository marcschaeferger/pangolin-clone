
all: build push

build-arm:
	docker buildx build --platform linux/arm64 -t fosrl/pangolin:latest .

build-x86:
	docker buildx build --platform linux/amd64 -t fosrl/pangolin:latest . 

build:
	docker build -t fosrl/pangolin:latest .

push:
	docker push fosrl/pangolin:latest

test:
	docker run -it -p 3000:3000 -p 3001:3001 -p 3002:3002 -v ./config:/app/config fosrl/pangolin:latest

clean:
	docker rmi pangolin
