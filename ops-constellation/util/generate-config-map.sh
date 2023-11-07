#! /bin/bash
# Parses grabs all present env variable values for each env variable name in envs/default.env
# then builds a k8s configmap by passing in all values as key-value pairs

COMMAND="kubectl create configmap envs-main-env"

echo $(egrep -v '^#' envs/default.env | xargs) | tr " " "\n" | 
(
   while IFS= read -r line; do
      key=${line%%=*}
      value=${!key}
      # Adds escape character to double quotes in order to preserve quotes in the configmap yaml
      processed_value=$(echo $value | sed 's/"/\\"/g')
      if [ -n "$value" ]; then
         COMMAND+=" --from-literal=${key}=\"${processed_value}\""
      fi
   done
   eval $COMMAND
   COMMAND+=" --dry-run | kubectl apply -f -"
   eval $COMMAND
   kubectl get configmaps envs-main-env -o yaml > k8s/config/envs-main-env.yaml
)


