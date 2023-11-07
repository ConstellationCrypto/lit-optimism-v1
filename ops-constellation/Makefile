DOCKER_COMPOSE_CMD := docker-compose \
	-f docker-compose-constellation.yml

build:
	DOCKER_BUILDKIT=1 \
	$(DOCKER_COMPOSE_CMD) \
		build
.PHONY: build

up:
	bash constellation-up.sh

down:
	bash constellation-down.sh

clean:
	bash constellation-clean.sh

ps:
	$(DOCKER_COMPOSE_CMD) \
		ps
.PHONY: ps


up-metrics: down-metrics
	METRICS=true bash constellation-up.sh
.PHONY: up-metrics

down-metrics:
	METRICS=true bash constellation-down.sh
.PHONY: down-metrics

clean-metrics:
	METRICS=true bash constellation-clean.sh
.PHONY: clean-metrics