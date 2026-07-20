#!/usr/bin/env bash
set -euo pipefail

RESOURCE_GROUP="${RESOURCE_GROUP:-cloud-native-task-api-rg}"
LOCATION="${LOCATION:-australiaeast}"
AKS_CLUSTER="${AKS_CLUSTER:-cloud-native-task-api-aks}"
ACR_NAME="${ACR_NAME:-taskapi$RANDOM$RANDOM}"

printf 'Creating resource group %s in %s\n' "$RESOURCE_GROUP" "$LOCATION"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" --output table

printf 'Creating Azure Container Registry %s\n' "$ACR_NAME"
az acr create --resource-group "$RESOURCE_GROUP" --name "$ACR_NAME" --sku Basic --output table

printf 'Creating AKS cluster %s\n' "$AKS_CLUSTER"
az aks create \
  --resource-group "$RESOURCE_GROUP" \
  --name "$AKS_CLUSTER" \
  --node-count 2 \
  --node-vm-size Standard_B2s \
  --enable-managed-identity \
  --attach-acr "$ACR_NAME" \
  --generate-ssh-keys \
  --output table

az aks get-credentials --resource-group "$RESOURCE_GROUP" --name "$AKS_CLUSTER" --overwrite-existing

cat <<SUMMARY

Azure infrastructure is ready.

Resource group: $RESOURCE_GROUP
AKS cluster:    $AKS_CLUSTER
ACR name:       $ACR_NAME
ACR login:      $ACR_NAME.azurecr.io

Add these GitHub repository variables:
AZURE_RESOURCE_GROUP=$RESOURCE_GROUP
AKS_CLUSTER_NAME=$AKS_CLUSTER
ACR_NAME=$ACR_NAME

Also configure the three OIDC secrets described in README.md.
SUMMARY
