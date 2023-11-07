#!/bin/bash
set -e

docker-compose -f docker-compose-constellation.yml -f docker-compose-metrics.yml down
rm -rf $(pwd)/../.constellation
docker image ls 'ops-constellation*' --format='{{.Repository}}' | xargs -r docker rmi
docker volume ls --filter name=ops-constellation --format='{{.Name}}' | xargs -r docker volume rm
