#!/bin/bash
# Restarts the ApnaGhar Fabric test network and redeploys the chaincode.
# Only touches Fabric's own containers/volumes (network.sh down cleans those up).
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_NETWORK="$ROOT_DIR/blockchain/fabric-samples/test-network"

if [ ! -d "$TEST_NETWORK" ]; then
    echo "❌ $TEST_NETWORK not found. Run ./blockchain/setup-fabric.sh first."
    exit 1
fi

cd "$TEST_NETWORK"

echo "📦 Stopping Fabric network..."
./network.sh down

echo "🚀 Starting Fabric network with channel 'apnaghar'..."
./network.sh up createChannel -c apnaghar -ca

echo "📋 Deploying chaincode..."
./network.sh deployCC -ccn apnaghar -ccp "$ROOT_DIR/blockchain/chaincode/apnaghar-contract" -ccl javascript -c apnaghar

echo ""
echo "✅ Fabric network restarted"
echo "Next: cd blockchain/api && npm start"
docker ps --filter "label=service=hyperledger-fabric" --format "table {{.Names}}\t{{.Status}}"
