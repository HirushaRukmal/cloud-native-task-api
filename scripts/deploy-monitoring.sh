#!/usr/bin/env bash
set -euo pipefail

GRAFANA_PASSWORD="${GRAFANA_PASSWORD:-}"
if [[ -z "$GRAFANA_PASSWORD" ]]; then
  echo "Set GRAFANA_PASSWORD before running this script."
  exit 1
fi

kubectl apply -f k8s/app/namespace.yaml
kubectl create secret generic grafana-admin \
  --namespace cloud-native \
  --from-literal=password="$GRAFANA_PASSWORD" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f k8s/monitoring/prometheus-rbac.yaml
kubectl apply -f k8s/monitoring/prometheus-config.yaml
kubectl apply -f k8s/monitoring/prometheus.yaml
kubectl apply -f k8s/monitoring/grafana-config.yaml
kubectl apply -f k8s/monitoring/grafana-dashboard-provider.yaml
kubectl create configmap grafana-dashboard \
  --namespace cloud-native \
  --from-file=task-api-dashboard.json=grafana/dashboards/task-api-dashboard.json \
  --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f k8s/monitoring/grafana.yaml

kubectl rollout status deployment/prometheus -n cloud-native --timeout=180s
kubectl rollout status deployment/grafana -n cloud-native --timeout=180s
kubectl get deployments,pods,services -n cloud-native
