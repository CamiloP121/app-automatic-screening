#! /bin/bash
docker build --no-cache -t mederi/app-automatic-screening:latest .

docker run -it \
   --rm \
   --env-file .sec_config\
   -v $PWD/..:/app-automatic-screening \
   --net="host" \
   --name="app-automatic-screening" \
   -e DEBUG="True" \
   mederi/app-automatic-screening:latest