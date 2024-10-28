
all: build push

build-arm:
	docker buildx build --platform linux/arm64 -t fossorial/pangolin:latest .

build-x86:
	docker buildx build --platform linux/amd64 -t fossorial/pangolin:latest .

push:
	docker push fossorial/pangolin:latest

test:
	docker run -it -p 3000:3000 -p 3001:3001 -v ./config:/app/config fossorial/pangolin:latest

clean:
	docker rmi pangolin
