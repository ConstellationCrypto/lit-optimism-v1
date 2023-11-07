kubectl delete -f ./k8s/config/integration-tests --ignore-not-found
kubectl apply -f ./k8s/config/integration-tests

# Wait for deployment to complete
kubectl rollout status deployment integration-tests -n default --timeout=1000s
# Run integration tests and attach to it
kubectl exec deployment.apps/integration-tests -- /bin/bash -c "MOCHA_TIMEOUT=720000 TEST_FPE=$TEST_FPE RUN_VERIFIER_TESTS=false ./integration-tests.sh"
