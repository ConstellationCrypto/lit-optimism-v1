#!/bin/bash
CONTAINER=l2geth

RETRIES=2000
i=0
until docker-compose -f docker-compose-constellation.yml logs l2geth | grep -q "Starting Sequencer Loop";
do
    sleep 1
    if [ $i -eq $RETRIES ]; then
        echo 'Timed out waiting for sequencer'
        exit 1
    fi
    echo 'Waiting for sequencer...'
    ((i=i+1))
done
