
all: build push

build:
	docker build -t fossorial/pangolin:latest .

push:
	docker push fossorial/pangolin:latest

test:
	docker run -it -p 3000:3000 -p 3001:3001 --env-file=.env -v ./config:/app/config pangolin

clean:
	docker rmi pangolin
