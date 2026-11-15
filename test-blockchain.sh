#!/bin/bash

API="${BLOCKCHAIN_API_URL:-http://localhost:3000/api/v1}"
AUTH=(-H "X-API-Key: ${BLOCKCHAIN_API_KEY:-}")

echo "🔍 Testing Blockchain Records..."
echo ""

# Test 1: Create a property
echo "1️⃣ Creating test property..."
RESPONSE=$(curl -s "${AUTH[@]}" -X POST "$API/property" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "test_'$(date +%s)'",
    "projectId": "proj1",
    "unitNumber": "101",
    "owner": "admin",
    "dataHash": "test_hash"
  }')

echo "Response: $RESPONSE"
echo ""

# Extract property ID from response
PROPERTY_ID=$(echo $RESPONSE | jq -r '.result.propertyId' 2>/dev/null || echo $RESPONSE | grep -o '"propertyId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROPERTY_ID" ]; then
  echo "❌ Failed to create property or extract ID"
  exit 1
fi

# Test 2: Query the property
echo "2️⃣ Querying property: $PROPERTY_ID"
curl -s "${AUTH[@]}" "$API/history/$PROPERTY_ID"
echo ""
echo ""

# Test 3: Update property status
echo "3️⃣ Updating property status..."
curl -s "${AUTH[@]}" -X PUT "$API/property/$PROPERTY_ID/status" \
  -H "Content-Type: application/json" \
  -d '{"status": "sold"}'
echo ""
echo ""

# Test 4: Query history again
echo "4️⃣ Querying updated history..."
curl -s "${AUTH[@]}" "$API/history/$PROPERTY_ID"
echo ""
echo ""

echo "✅ Test complete!"
echo ""
echo "Property ID: $PROPERTY_ID"
echo "You can query this property anytime with:"
echo "  curl http://localhost:3000/api/v1/history/$PROPERTY_ID"
