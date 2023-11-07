#!/bin/bash
set -e

if [ -z "$K8S" ]; then
  if [ -n "$METRICS" ]; then
    docker-compose -f docker-compose-constellation.yml -f docker-compose-metrics.yml down
  else
    docker-compose -f docker-compose-constellation.yml down
  fi
  docker image ls 'ops-constellation*' --format='{{.Repository}}' | xargs -r docker rmi
else
  minikube stop
fi