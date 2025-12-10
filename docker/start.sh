#!/bin/bash

# Navigate to project root
cd ..

# Build Docker image
docker build -t mederi/app-automatic-screening:latest -f dockerfile .

# Run container for local development
docker run -it \
   --rm \
   --env-file docker/.sec_config\
   -v $PWD:/app-automatic-screening \
   --net="host" \
   --name="app-automatic-screening" \
   -e DEBUG="True" \
   mederi/app-automatic-screening:latest