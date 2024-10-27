
all: build push

build:
	docker build -t fossorial/pangolin:latest .

push:
	docker push fossorial/pangolin:latest

test:
	docker run -it -p 3000:3000 -p 3001:3001 -v ./config:/app/config fossorial/pangolin:latest

clean:
	docker rmi pangolin
