
all:
	docker build -t pangolin .

test:
	docker run -it -p 3000:3000 -p 3001:3001 --env-file=.env-docker -v ./config:/config pangolin

clean:
	docker rmi pangolin