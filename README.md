# ApnaGhar

A real-estate platform that makes construction progress provable. Builders upload geotagged, camera-only site photos by scanning a QR code on site, documents are stored on IPFS, records are anchored on a Hyperledger Fabric blockchain, and an AI assistant answers questions about projects and units.

This repository is the self-contained local demo of the project: everything runs locally with one command. The cloud services the project used before (Supabase, Cloudinary, Pinata, Razorpay, Groq) are optional: each has a local equivalent that is used automatically when its keys aren't set.

---

## Quick start (Docker)

Requirements: Docker with Compose, and `make`.

```bash
git clone <your-repo-url> ApnaGhar
cd ApnaGhar
make up            # builds and starts everything
```

Open **http://localhost:8080**. The first start takes a few minutes: the database is loaded, and the AI assistant builds its search index (`make logs s=rag` to watch).

| Account | Email | Password |
| --- | --- | --- |
| Admin | `admin@apnaghar.local` | `Admin@12345` (set `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`) |
| Builder | `prestige.estates@builders.apnaghar.local` | `Builder@123` |
| Buyer (demo) | `buyer1@apnaghar.com` | `testpass123` |

On first start the database is filled from the **old cloud data export** (`rag-pipeline/data/*.csv`: 75 projects, about 9,200 units), and a builder login is created for each developer (for example `prestige.estates@builders.apnaghar.local` / `Builder@123`). Set `IMPORT_CLOUD_EXPORT=false` for generated demo data instead.

**See [docs/DEMO_GUIDE.md](docs/DEMO_GUIDE.md) for every login and a step-by-step walkthrough for buyers, builders, the phone upload and admins.**

### What runs

| Service | URL | Replaces |
| --- | --- | --- |
| Frontend (Vite) | http://localhost:8080 | Vercel |
| Backend (Django) | http://localhost:8000 (`/admin/` for Django admin) | Render |
| PostgreSQL | `localhost:5432` (apnaghar / apnaghar) | Supabase |
| IPFS node (Kubo) | gateway proxied at `/ipfs/` | Pinata |
| AI assistant (RAG) | http://localhost:8001 | the ngrok-exposed laptop service |
| Uploaded photos | stored in the `media` volume, served at `/media/` | Cloudinary |

The frontend proxies `/api`, `/media` and `/ipfs` to the other services, so the browser only ever talks to one address (this is what makes phone testing work).

### Testing from your phone (QR scanning and camera uploads)

Browsers only allow camera access on HTTPS, so:

```bash
make phone         # restarts the frontend with a self-signed HTTPS certificate
```

Open `https://<your-laptop-ip>:8080` on the phone (same Wi-Fi) and accept the certificate warning. Log in as the builder, open a unit and use **Start Secure Upload** to scan its QR code.

---

## Without Docker

Requirements: Python 3.12 or 3.13, Node 18+.

```bash
make install       # .venv (backend), .venv-rag (AI assistant), frontend node_modules
make dev           # backend :8000 (SQLite), AI assistant :8001, frontend :8080 - Ctrl+C stops all
```

This uses SQLite (`backend/db.sqlite3`) and local files (`backend/media/`). For local IPFS without Docker, run any IPFS node and set `IPFS_API_URL`; otherwise documents are stored as local files identified by their SHA-256 hash.

---

## Local vs cloud: what changes

Each feature uses the cloud service when its keys are in `.env`, and the local equivalent otherwise. The app behaves the same either way.

| Feature | With keys | Without keys (local) |
| --- | --- | --- |
| Database | `DATABASE_URL` (e.g. Supabase) | Postgres container, or SQLite |
| Photos and videos | Cloudinary | `MEDIA_ROOT`, served from `/media/` |
| Documents | Pinata | local IPFS node (real CIDs), or local files |
| Payments | Razorpay (test or live keys) | **Test mode**: clearly labelled simulated payments that update bookings exactly like real ones (only when `DEBUG=True`) |
| AI answers | Groq LLM (`GROQ_API_KEY`) | answers built directly from search results |
| Blockchain | Fabric network (`make fabric`) | records are still saved and hashed, marked "not anchored on-chain" |
| Google login | `GOOGLE_CLIENT_ID` / `SECRET` | email and password only |
| Email | SMTP settings | printed to the backend console |

> **ufw users:** with ufw enabled, containers can't reach the internet (the default forward policy drops it). The stack doesn't need internet, but Groq answers from inside Docker do. To allow it: `sudo ufw default allow routed`.

---

## Who can see what

| | Visitor | Buyer | Builder | Admin |
| --- | --- | --- | --- | --- |
| Projects, available units, public construction updates | yes | yes | yes | yes |
| Book and pay for a unit | sign in first | yes | not in own projects | yes |
| A unit's QR code, private photos, documents, unit-only updates | no | **only units they booked or bought** | **only units in their own projects** | all |
| Upload site photos (QR scan, phone camera) and documents | no | no | own projects only | documents |
| Edit projects, units, milestones | no | no | own projects only | all |
| Record offline payments, confirm bookings | no | no | own projects only | all |
| Verify milestones, manage admins | no | no | no | yes |

Booking a unit reserves it for that buyer straight away. Cancelling releases it, and full payment marks it sold.

### Admins

There is one root admin, created on startup from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (`make admin` re-runs it). Admins get an **Admin** tab to search users and make or remove admins. Nobody can remove their own admin rights, so there is always at least one admin. As an alternative bootstrap, set `ADMIN_BOOT_TOKEN` and the first signed-in user can claim admin once via `POST /api/auth/admin/boot/`.

---

## Blockchain (optional)

```bash
make fabric          # downloads Hyperledger Fabric (first time), starts the network, deploys the chaincode
make blockchain-api  # Node.js API on :3000 that the backend writes through
```

Set the same `BLOCKCHAIN_API_KEY` in `.env` and in `blockchain/api/.env`. The Docker backend reaches the API on your host via `host.docker.internal`. Without Fabric, uploads still work and their records say they weren't anchored.

---

## Commands

```
make help          list everything
make up / down     start / stop the Docker stack (data is kept)
make reset         stop and DELETE all local data
make logs s=NAME   follow logs (backend, frontend, rag, db, ipfs)
make import-data   replace demo data with the old cloud export
make rag-refresh   re-export the database for the AI assistant and rebuild its index
make build         rebuild images (needed after changing AI assistant code)
make test          backend tests + frontend type-check and build
```

## Configuration

Copy `.env.example` to `.env` (`make up` does this for you). Everything in it is optional locally. See the table above for what each key enables.

## Tech stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Django 5.2, Django REST Framework, SimpleJWT, PostgreSQL
- **Blockchain:** Hyperledger Fabric 2.5 chaincode with a Node.js gateway API
- **Storage:** local media or Cloudinary; IPFS (Kubo or Pinata)
- **AI assistant:** sentence-transformers embeddings, FAISS, optional Groq LLM
- **Payments:** Razorpay, with a local test mode

## Project layout

```
backend/         Django API (users, projects, bookings, payments, blockchain records, chatbot proxy, ...)
frontend/        React app
rag-pipeline/    AI assistant: data loader, embeddings, FAISS index, query engine (+ CSV export of the old DB)
rag-service.py   Flask server for the AI assistant
blockchain/      Fabric chaincode, Node.js API, setup scripts
docs/            demo guide (logins, walkthroughs) and longer guides (deployment, blockchain)
archive/         the original early prototype, kept for reference
```

## License

MIT, see [LICENSE](./LICENSE).
