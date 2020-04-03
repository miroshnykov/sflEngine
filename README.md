# sfl-core-engine
> This is a central project, capable of spawning the stack described bellow.

- sfl-core-engine

# Steps to turn on container with build
> 1. Authenticate with DockerHub

> 2. Create a Network
    
    - run command: docker network create sfl-network

> 3. Create domain mapping by running the following Command:

    - echo "127.0.0.1       sfl-core-engine.test" >> /etc/hosts

> 4. Run Whole Stack Requires the following command (note: for local dev, change the
>    image release to the desired one in docker-compose.yml)

    -  run command: docker-compose up -d

> 5. Run Single Container (one service)
>>    run command: docker-compose up -d sfl-core-condition

# Development Flow
1. like traditional development, git pull and do your work
2. test your build locally on docker (replace the [ ] with desired state)
 >   
    - RUN: docker build -t  [project]:[Branch] .
    - RUN: docker images
Note: you will see the repository and tag project & Branch
>
    - RUN: docker run --publish 8087:8080 --detach --name [ContainerName] [project]:[Branch]
    - RUN: docker stop [ContaineName]  ||  docker stop [ContaineName] 
    - RUN: docker images
Note: take note of the IMAGE ID
>
    - RUN: docker rmi [IMAGE ID]
3. push to github you changes
4. create a release for a build to be triggered.
5. deploy once build ready

 # Common Docker Commands

### View
> 
    - docker Images , view Images
    - docker ps , view containers on
    - docker ps , view all containers including inactive

###  Build 
> 
    - docker-compose build, build image
    - docker-compose up, turn on all attached
    - docker-compose up -d , detached
    - docker-compose --verbose up , with logs

### Connect
> 
    - docker exec -it core-condition /bin/bash , will let you ssh into container

###  STOP/START Container 
> 
    - docker-compose stop, stop containers can start them later
    - docker-compose start, simply starts containers
    - docker-compose down , stops all services and removes them

### Cleanup
    - docker image prune -a , remove all images without associated container

### Get New Release (change the release in docker-compose.yml)
> 
    - docker-compose up -d --no-deps --build sfl-core-condition

# [PRODUCTION COMMANDS]

## [DEPLOY & Re-Deploy Production File]
###  Deploy & Re-Deploy single application
   
    - RELEASE=[TAG] docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps --build sfl-core-condition

# [STAGING COMMANDS]

## [DEPLOY & Re-Deploy Staging File]
### Deploy & Re-Deploy single application
    - RELEASE=[TAG] docker-compose -f docker-compose.yml -f docker-compose.stage.yml up -d --no-deps --build core-condition


