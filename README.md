# sfl-core-engine
event processing

[Build]
docker-compose build

[Start Build]
docker-compose up

[Start Build In Background]
docker-compose up -d

[Start Build With Debug]
docker-compose --verbose up

[Build & Start]
docker-compose up --build

[List Images Created]
docker Images

[List active containers]
docker ps

[List Inactive containers]
docker ps -l

[SSH INTO Container]
docker exec -it cor-enginee /bin/bash

[STOP/START Container]
docker-compose stop
docker-compose start

[Stop All Service & Remove Containers]
docker-compose  down