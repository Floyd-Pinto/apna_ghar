#!/bin/bash
# Downloads Hyperledger Fabric (Docker images, binaries and fabric-samples)
# into blockchain/fabric-samples using the bundled install-fabric.sh.
set -e

cd "$(dirname "${BASH_SOURCE[0]}")"

echo "Installing Fabric (Docker images, binaries and samples)..."
# d: docker images, b: binaries, s: fabric-samples
./install-fabric.sh --fabric-version 2.5.14 --ca-version 1.5.15 d b s

echo "Fabric installation complete: $(pwd)/fabric-samples"
