require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { connectToNetwork } = require('./fabric');

const app = express();
app.use(bodyParser.json());

// Only the Django backend talks to this API, so browsers are limited to an
// explicit allow-list (comma-separated CORS_ORIGINS). Empty = no browser access.
const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));

const port = process.env.PORT || 3000;
const apiKey = process.env.BLOCKCHAIN_API_KEY || '';

let contract;
let gateway;

// Initialize Fabric connection
connectToNetwork().then((network) => {
    contract = network.contract;
    gateway = network.gateway;
    console.log('Connected to Fabric network');
}).catch((err) => console.error('Failed to connect to Fabric network:', err));

// Health check (no auth) so the backend/monitoring can see if Fabric is up
app.get('/health', (req, res) => {
    res.json({ status: contract ? 'connected' : 'disconnected' });
});

// Require X-API-Key on every /api route when BLOCKCHAIN_API_KEY is set
if (!apiKey) {
    console.warn('BLOCKCHAIN_API_KEY not set - API is unauthenticated (local development only)');
}
app.use('/api', (req, res, next) => {
    if (apiKey && req.get('X-API-Key') !== apiKey) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    next();
});

// Reject requests until the Fabric gateway is ready instead of crashing on `contract` being undefined
app.use('/api', (req, res, next) => {
    if (!contract) {
        return res.status(503).json({ success: false, error: 'Blockchain network not connected' });
    }
    next();
});

// Endpoints

// Create Property
app.post('/api/v1/property', async (req, res) => {
    try {
        const { propertyId, projectId, unitNumber, owner, dataHash } = req.body;
        const result = await contract.submitTransaction('CreateProperty', propertyId, projectId, unitNumber, owner, dataHash);
        res.json({ success: true, result: JSON.parse(result.toString()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Update Property Status
app.put('/api/v1/property/:id/status', async (req, res) => {
    try {
        const { status, owner } = req.body;
        const result = await contract.submitTransaction('UpdatePropertyStatus', req.params.id, status, owner || '');
        res.json({ success: true, result: JSON.parse(result.toString()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Record Milestone
app.post('/api/v1/milestone', async (req, res) => {
    try {
        const { milestoneId, projectId, title, status, ipfsHash, verifier } = req.body;
        const result = await contract.submitTransaction('RecordMilestone', milestoneId, projectId, title, status, ipfsHash, verifier);
        res.json({ success: true, result: JSON.parse(result.toString()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Store Document
app.post('/api/v1/document', async (req, res) => {
    try {
        const { documentId, projectId, docType, ipfsHash, owner } = req.body;
        const result = await contract.submitTransaction('StoreDocument', documentId, projectId, docType, ipfsHash, owner);
        res.json({ success: true, result: JSON.parse(result.toString()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get History
app.get('/api/v1/history/:id', async (req, res) => {
    try {
        const result = await contract.evaluateTransaction('GetAssetHistory', req.params.id);
        res.json({ success: true, result: JSON.parse(result.toString()) });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Blockchain API listening at http://localhost:${port}`);
});

// Close the Fabric gateway cleanly on shutdown
process.on('SIGINT', () => {
    if (gateway) gateway.disconnect();
    process.exit(0);
});
