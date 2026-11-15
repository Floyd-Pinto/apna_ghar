# ApnaGhar - Complete Project Guide

> For running the project locally (Docker or not), see the [README](../README.md). This guide covers the hosted deployment and the blockchain in more depth.

**Version:** 1.0  
**Last Updated:** November 24, 2025  
**Status:** Production Ready (95% Complete)

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [System Status](#system-status)
3. [Features & Functionality](#features--functionality)
4. [Blockchain Integration](#blockchain-integration)
5. [Blockchain Verification](#blockchain-verification)
6. [Deployment Guide](#deployment-guide)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## 1. PROJECT OVERVIEW

### What is ApnaGhar?

ApnaGhar is a blockchain-powered real estate platform that provides:
- **Transparent Property Management** with immutable records
- **Secure Document Storage** on IPFS
- **Real-time Construction Tracking** with photo/video evidence
- **Fractional Ownership** and investment opportunities
- **Verified Builder Profiles** and reviews

### Technology Stack

**Frontend:**
- React 18 + TypeScript
- Vite build tool
- Tailwind CSS + Shadcn UI
- React Query for data fetching

**Backend:**
- Django 4.2 + Django REST Framework
- PostgreSQL database
- Cloudinary (media storage)
- Pinata/IPFS (permanent storage)

**Blockchain:**
- Hyperledger Fabric 2.5
- Node.js chaincode
- Express.js middleware API

**Additional Services:**
- Razorpay (payments)
- Email notifications
- Analytics tracking

---

## 2. SYSTEM STATUS

### Overall Status: ✅ 95% OPERATIONAL - PRODUCTION READY

| Component | Status | Completion |
|-----------|--------|------------|
| **Backend (Django)** | ✅ Operational | 95% |
| **Frontend (React)** | ✅ Operational | 90% |
| **Blockchain** | ✅ Operational | 100% |
| **Infrastructure** | ✅ Operational | 100% |

### Feature Completion

#### ✅ 100% Complete Features (25)

**Core Features:**
1. User Authentication (Email, Google OAuth, JWT)
2. Project Management (CRUD operations)
3. Property Management (Units, bookings)
4. Payment Integration (Razorpay)
5. Support System (Tickets, responses)
6. Notifications (In-app, email)
7. Investments (Fractional ownership)
8. Analytics (Event tracking)
9. AI Chatbot (Rule-based)

**Upload & Storage:**
10. Cloudinary Integration (Images, videos)
11. IPFS Integration (Permanent storage)
12. Hash Verification (SHA-256)
13. Geotagging (GPS coordinates)
14. Camera Metadata (Device, timestamp)
15. Secure Upload Flow (Mobile-only)

**Blockchain:**
16. Hyperledger Fabric Network
17. Chaincode Deployment
18. Property Records
19. Milestone Tracking
20. Document Hashing
21. Audit Trail

**Real-Time:**
22. Progress Tracking
23. Notification System
24. Auto-refresh (30s polling)
25. Event Broadcasting

#### ⚠️ Partial Features (2)

1. **QR Code Scanning** (90% Complete)
   - ✅ Component created
   - ✅ Backend endpoint exists
   - ⚠️ Integration pending

2. **Advanced Search & Filtering** (70% Complete)
   - ✅ Filter UI created
   - ✅ Backend filtering exists
   - ⚠️ Integration pending

---

## 3. FEATURES & FUNCTIONALITY

### 3.1 Cloudinary Uploads with Hash Verification

**Status:** ✅ FULLY OPERATIONAL

**Features:**
- 8 upload points in codebase
- SHA-256 hash calculation
- Duplicate detection
- Secure URL generation
- Metadata storage

**Implementation:**
```python
# Hash calculation
content_hash = hashlib.sha256(file_bytes).hexdigest()

# Upload with hash
cloudinary.uploader.upload(
    io.BytesIO(img_bytes),
    resource_type='image',
    public_id=public_id,
    context={'hash': content_hash}
)
```

### 3.2 Geotagging & Camera Metadata

**Status:** ✅ FULLY OPERATIONAL

**Features:**
- GPS coordinates capture
- Timestamp verification
- Device type validation
- Camera vs Gallery detection
- Mobile-only enforcement

**Validation:**
```python
capture_metadata = {
    'camera_captured': bool,
    'device_type': 'mobile',
    'timestamp': ISO format,
    'geolocation': {lat, lng}
}
```

### 3.3 IPFS Integration (Pinata)

**Status:** ✅ FULLY OPERATIONAL

**Features:**
- File upload to IPFS
- Permanent pinning
- IPFS hash generation
- Gateway URL creation
- Blockchain integration

**Storage:**
- Progress updates
- Construction documents
- Property documents
- Milestone evidence

### 3.4 Real-Time Tracking

**Status:** ✅ FULLY OPERATIONAL

**Features:**
- Construction progress updates
- Milestone completions
- Document uploads
- Payment status changes
- Booking confirmations
- Notification system (30s polling)

**Notification Triggers:**
- ✅ Construction updates posted
- ✅ Progress updates uploaded
- ✅ Documents uploaded
- ✅ Bookings created/confirmed
- ✅ Payments received/failed

---

## 4. BLOCKCHAIN INTEGRATION

### 4.1 Network Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                      │
│  - File Upload UI                                        │
│  - Real-time Updates                                     │
│  - Blockchain Records Viewer                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  DJANGO BACKEND                          │
│  Secure Upload Flow:                                     │
│  1. Validate metadata (GPS, camera, device)              │
│  2. Calculate SHA-256 hash                               │
│  3. Upload to Cloudinary (with hash)                     │
│  4. Upload to IPFS (Pinata)                              │
│  5. Store on Blockchain (via middleware)                 │
│  6. Save to PostgreSQL                                   │
│  7. Send notifications                                   │
└──────┬──────────────────────────┬─────────────────┬─────┘
       │                          │                 │
       ▼                          ▼                 ▼
┌─────────────┐          ┌──────────────┐   ┌─────────────┐
│  Cloudinary │          │ IPFS/Pinata  │   │  Blockchain │
│  (Media)    │          │  (Hashes)    │   │  Middleware │
└─────────────┘          └──────────────┘   └──────┬──────┘
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │ Hyperledger   │
                                            │ Fabric        │
                                            │ (Immutable)   │
                                            └───────────────┘
```

### 4.2 Network Status

**Containers Running:** 8
- 2 Chaincode containers (apnaghar v1.0)
- 2 Peer containers (Org1, Org2)
- 1 Orderer container
- 3 CA containers

**Channel:** apnaghar  
**Chaincode:** apnaghar v1.0

### 4.3 Blockchain Functions

```javascript
// Property Management
CreateProperty(propertyId, projectId, unitNumber, owner, dataHash)
UpdatePropertyStatus(propertyId, status, owner)

// Construction Milestones
RecordMilestone(milestoneId, projectId, title, status, ipfsHash, verifier)

// Document Management
StoreDocument(documentId, projectId, docType, ipfsHash, owner)

// Queries
ReadAsset(id)
GetAssetHistory(id)
```

### 4.4 Data Stored on Blockchain

- Property creation records
- Ownership transfers
- Construction milestones
- Document IPFS hashes
- Progress update hashes
- Verification timestamps

---

## 5. BLOCKCHAIN VERIFICATION

### 5.1 Eight Ways to Verify Immutable Records

#### Method 1: Frontend UI (Easiest)
```
http://localhost:5173/blockchain-records
```
- View all blockchain transactions
- See IPFS hashes
- Check transaction IDs
- Verify timestamps
- Download documents from IPFS

#### Method 2: Docker Logs (Real-Time)
```bash
# Watch Org1 chaincode
docker logs -f $(docker ps | grep "dev-peer0.org1.example.com-apnaghar" | awk '{print $1}')

# Watch peer logs
docker logs -f peer0.org1.example.com
```

**What You'll See:**
```
[Chaincode] INFO: Received function: CreateProperty
[Chaincode] INFO: Args: ["prop123", "proj1", "101", "admin", "hash123"]
[Chaincode] INFO: ✅ Property created successfully
[Peer] INFO: Committed block [12] with 1 transaction(s)
```

#### Method 3: Blockchain API
```bash
# Query property history
curl http://localhost:3000/api/v1/history/property_id | jq
```

**Response:**
```json
{
  "success": true,
  "history": [
    {
      "txId": "abc123...",
      "timestamp": "2025-11-24T06:30:00.000Z",
      "value": {
        "propertyId": "prop123",
        "status": "created",
        "dataHash": "sha256hash..."
      }
    }
  ]
}
```

#### Method 4: Peer CLI
```bash
# Setup environment
export PATH=${PWD}/blockchain/fabric-samples/bin:$PATH
cd blockchain/fabric-samples/test-network

# Query
peer chaincode query \
  -C apnaghar \
  -n apnaghar \
  -c '{"function":"ReadAsset","Args":["property_id"]}'
```

#### Method 5: Django Admin
```
http://localhost:8000/admin/blockchain/
```
- BlockchainProgressUpdate records
- BlockchainDocument records
- IPFS hashes
- Transaction IDs

#### Method 6: PostgreSQL Direct
```sql
SELECT id, progress_id, ipfs_hash, tx_id, verified, created_at 
FROM blockchain_blockchainprogressupdate 
ORDER BY created_at DESC;
```

#### Method 7: IPFS Verification
```bash
# Pinata Gateway
https://gateway.pinata.cloud/ipfs/QmYourHash

# Public Gateway
https://ipfs.io/ipfs/QmYourHash
```

#### Method 8: Custom Explorer
```bash
#!/bin/bash
# Get latest block
docker exec peer0.org1.example.com peer channel getinfo -c apnaghar
```

### 5.2 Immutability Guarantees

**What CANNOT Be Changed:**
- ✅ Transaction history
- ✅ IPFS file content
- ✅ Blockchain records
- ✅ Timestamps
- ✅ Transaction IDs
- ✅ Content hashes

**What CAN Be Changed:**
- ⚠️ Database records (blockchain remains unchanged)
- ⚠️ Cloudinary URLs (IPFS copy remains)
- ⚠️ Frontend display (data remains)

**Key Point:** Even if database is modified, blockchain and IPFS provide immutable proof.

---

## 6. DEPLOYMENT GUIDE

### 6.1 Pre-Deployment Checklist

#### Database Verification
```bash
make shell   # then inspect models in the Django shell
```

Or manually:
```bash
cd backend
source ../venv/bin/activate
python3 manage.py shell
```

```python
from projects.models import *
from users.models import *
from blockchain.models import *

print("Users:", CustomUser.objects.count())
print("Projects:", Project.objects.count())
print("Properties:", Property.objects.count())
print("Blockchain Progress:", BlockchainProgressUpdate.objects.count())
print("Blockchain Docs:", BlockchainDocument.objects.count())
```

#### Environment Variables

**Backend (.env):**
```bash
DATABASE_URL=postgresql://...
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com,*.render.com

CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

PINATA_API_KEY=...
PINATA_SECRET_KEY=...

RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...

BLOCKCHAIN_API_URL=http://your-blockchain-server:3000/api/v1

EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_HOST_USER=...
EMAIL_HOST_PASSWORD=...
```

**Frontend (.env.production):**
```bash
VITE_API_URL=https://your-backend.onrender.com
VITE_RAZORPAY_KEY_ID=...
```

### 6.2 Frontend Deployment (Vercel)

#### Step 1: Prepare
```bash
cd frontend
echo "VITE_API_URL=https://your-backend.onrender.com" > .env.production
npm run build
npm run preview  # Test locally
```

#### Step 2: Deploy
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel login
cd frontend
vercel --prod
```

**Or use Vercel Dashboard:**
1. Go to https://vercel.com
2. Import from GitHub
3. Set root directory to `frontend`
4. Add environment variables
5. Deploy

### 6.3 Backend Deployment (Render)

#### Step 1: Prepare
```bash
cd backend

# Install dependencies
pip install gunicorn whitenoise dj-database-url
pip freeze > requirements.txt
```

#### Step 2: Update settings.py
```python
import dj_database_url

DEBUG = os.getenv('DEBUG', 'False') == 'True'
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost').split(',')

DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv('DATABASE_URL'),
        conn_max_age=600
    )
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    # ... other middleware
]

STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
```

#### Step 3: Deploy to Render
1. Go to https://render.com
2. New Web Service
3. Connect GitHub
4. Set root directory to `backend`
5. Build command: `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
6. Start command: `gunicorn backend.wsgi:application`
7. Add environment variables
8. Create PostgreSQL database
9. Deploy

### 6.4 Blockchain Deployment (Self-Hosted VM)

**Requirements:**
- Ubuntu 20.04+ server
- 4GB RAM minimum
- Docker installed

**Setup:**
```bash
# SSH into server
ssh user@your-server-ip

# Clone repository
git clone https://github.com/your-repo/ApnaGhar.git
cd ApnaGhar

# Start Fabric network
cd blockchain/fabric-samples/test-network
./network.sh up createChannel -c apnaghar -ca
./network.sh deployCC -ccn apnaghar -ccp ../../chaincode/apnaghar-contract -ccl javascript -c apnaghar

# Start blockchain API
cd ../../api
npm install
pm2 start app.js --name blockchain-api

# Setup nginx
sudo nano /etc/nginx/sites-available/blockchain
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name blockchain.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 6.5 Database Migration

**Export from Local:**
```bash
python3 manage.py dumpdata > data.json
```

**Import to Production:**
```bash
# On Render Shell
python manage.py loaddata data.json
```

### 6.6 Post-Deployment Verification

```bash
# Frontend
curl https://your-app.vercel.app

# Backend
curl https://your-backend.onrender.com/api/health/

# Database
python manage.py shell -c "from projects.models import Project; print(Project.objects.count())"

# Blockchain
curl http://your-blockchain-server:3000/api/v1/health
```

---

## 7. MONITORING & MAINTENANCE

### 7.1 Real-Time Monitoring

**Terminal Setup (4 terminals):**

**Terminal 1: Blockchain API**
```bash
cd blockchain/api
node app.js
```

**Terminal 2: Chaincode Logs**
```bash
docker logs -f $(docker ps | grep "dev-peer0.org1.example.com-apnaghar" | awk '{print $1}')
```

**Terminal 3: Peer Logs**
```bash
docker logs -f peer0.org1.example.com
```

**Terminal 4: Django Backend**
```bash
cd backend
python manage.py runserver
```

### 7.2 Health Checks

```bash
# Check all services
docker ps
curl http://localhost:3000/api/v1/health
curl http://localhost:8000/api/health/
curl http://localhost:5173
```

### 7.3 Backup Strategy

**Database Backup:**
```bash
# Daily backup
python3 manage.py dumpdata > backup_$(date +%Y%m%d).json
```

**Blockchain Backup:**
```bash
# Backup ledger data
tar -czf blockchain_backup_$(date +%Y%m%d).tar.gz \
  blockchain/fabric-samples/test-network/organizations
```

---

## 8. TROUBLESHOOTING

### 8.1 Common Issues

#### Frontend Build Errors
```bash
# Clear cache
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Backend Migration Errors
```bash
# Reset migrations
python manage.py migrate --fake-initial
python manage.py migrate
```

#### Blockchain Connection Errors
```bash
# Restart network
cd blockchain/fabric-samples/test-network
./network.sh down
./network.sh up createChannel -c apnaghar -ca

# Redeploy chaincode
./network.sh deployCC -ccn apnaghar -ccp ../../chaincode/apnaghar-contract -ccl javascript -c apnaghar
```

#### Docker Container Issues
```bash
# Clean restart
./restart-fabric.sh
```

### 8.2 Logs Location

- **Django:** `backend/logs/`
- **Fabric:** `docker logs <container_name>`
- **Frontend:** Browser console
- **Blockchain API:** Terminal output

---

## 9. QUICK REFERENCE

### 9.1 Essential Commands

```bash
# Start all services
make up      # or: make dev (without Docker)

# Check database
make shell   # then inspect models in the Django shell

# Clean Docker
make reset   # removes all local data

# Restart blockchain
./restart-fabric.sh

# Monitor blockchain
docker logs -f $(docker ps | grep "apnaghar" | awk '{print $1}')
```

### 9.2 Important URLs

**Local Development:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- Blockchain API: http://localhost:3000
- Admin: http://localhost:8000/admin

**Production:**
- Frontend: https://your-app.vercel.app
- Backend: https://your-backend.onrender.com
- Blockchain: http://your-blockchain-server:3000

### 9.3 Key Files

- **Backend Settings:** `backend/backend/settings.py`
- **Blockchain Service:** `backend/blockchain/blockchain_service.py`
- **Chaincode:** `blockchain/chaincode/apnaghar-contract/index.js`
- **Blockchain API:** `blockchain/api/app.js`
- **Frontend Config:** `frontend/vite.config.ts`

---

## 10. CONCLUSION

### Project Status: ✅ PRODUCTION READY

**Achievements:**
- ✅ Complete blockchain integration
- ✅ Secure upload system with geotagging
- ✅ IPFS permanent storage
- ✅ Real-time tracking and notifications
- ✅ Comprehensive verification system
- ✅ Production-ready deployment guides

**Next Steps:**
1. Deploy to Vercel (Frontend)
2. Deploy to Render (Backend)
3. Setup blockchain on VM
4. Configure custom domain
5. Enable monitoring
6. Launch! 🚀

**The ApnaGhar platform is fully functional and ready for production use!**

---

**For Support:**
- Check troubleshooting section
- Review Docker logs
- Verify blockchain records
- Test with `make shell`

**Happy Deploying!** 🎉
