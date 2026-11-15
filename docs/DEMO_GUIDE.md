# ApnaGhar demo guide

How to start the demo, which accounts to use, and what to try with each role.

## 1. Start it

```bash
make up                  # first start takes a few minutes
make logs s=backend      # wait for "Imported 10 developers, 75 projects..."
make logs s=rag          # the AI assistant is ready at "Running on http://0.0.0.0:8001"
```

Open **http://localhost:8080**. `make down` stops it (data is kept); `make reset` wipes everything for a clean start.

## 2. Logins

All accounts are created automatically on first start.

| Role | Email | Password | Notes |
| --- | --- | --- | --- |
| Admin | `admin@apnaghar.local` | `Admin@12345` | Change with `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env` |
| Builder | `prestige.estates@builders.apnaghar.local` | `Builder@123` | Owns 10 projects from the imported data |
| Builder | `godrej.properties@builders.apnaghar.local` | `Builder@123` | A second builder, to check builders can't touch each other's projects |
| Buyer | `buyer1@apnaghar.com` | `testpass123` | |
| Buyer | `buyer2@apnaghar.com` | `testpass123` | A second buyer, to check privacy between buyers |

The other imported builders follow the same pattern, all with password `Builder@123`:
`brigade.group@`, `sobha.limited@`, `puravankara.limited@`, `embassy.group@`, `mantri.developers@`,
`shriram.properties@`, `mahindra.lifespaces@` and `l.t.realty@` (each followed by `builders.apnaghar.local`).

You can also sign up as a new buyer or builder from **Get started**. New builders get a developer profile automatically and can create projects straight away.

## 3. Buyer walkthrough (`buyer1@apnaghar.com`)

1. **Explore** projects, search by city, and save a few with the heart icon. They appear under *Dashboard → Saved Projects*.
2. Open a project, then pick an **available** unit and **Book This Property**.
   - The unit is reserved for you immediately. Its page now says *You own this unit* and shows its **QR code** and **documents**.
3. Go to **Bookings**, open the booking and press **Pay Now**.
   - Without Razorpay keys this is a labelled **test payment** (no money involved). The booking moves to *Token Paid*.
4. Ask the **AI assistant** (chat bubble, bottom right), e.g. "2BHK in Pune under 80 lakhs".
5. Log in as `buyer2@apnaghar.com` and open the same unit URL: access is denied. Buyers only see their own units.

## 4. Builder walkthrough (`prestige.estates@builders.apnaghar.local`)

1. **Dashboard** lists your projects. On a project card, **Show QR** opens *QR Code Management*.
2. **Add milestone** (e.g. "Foundation"). Every milestone and every unit has its own QR code; print it with **Print** / **Download**.
3. Open a unit you own: you see its QR code, **Start Secure Upload** and the document upload.
4. **Upload a document** (any PDF) under *Blockchain Documents*. It is stored on the local IPFS node and its content ID (CID) is recorded.
5. **Bookings** shows buyers' bookings for your projects. From a booking you can **Confirm** it or **Record offline payment**.
6. Log in as `godrej.properties@...` and try to open Prestige's unit or QR page: it's refused.

## 5. The phone upload (the anti-fraud feature)

This is the core idea: a builder can't fake progress with old photos.

1. On the laptop: `make phone`. It prints an address like `https://192.168.x.x:8080`.
2. On a phone on the same Wi-Fi, open that address and accept the certificate warning (the certificate is self-signed).
   If it doesn't load, the laptop firewall is blocking it: `sudo ufw allow 8080/tcp`.
3. Log in as the builder **on the phone** and open one of your units (or **Manage QR Codes → Secure Upload**).
4. **Scan** the unit's QR code. Show it on the laptop screen or print it.
5. **Take** photos with the camera, and allow **location** access when asked.
6. Upload. The server checks:
   - the request comes from a phone, and the QR code belongs to *your* project
   - each photo was **taken in the last 15 minutes**, using both the file time and the camera's own EXIF "date taken", so gallery or old photos are refused
   - a **GPS fix** is attached; with `UPLOAD_GEOFENCE_KM` set, the fix must also be near the project's coordinates
7. Log in as the unit's buyer: the photo appears under *Construction Progress* marked **Verified on site**, with the location (opens a map) and the capture time.

Try uploading an old photo from the gallery, or denying location access: the upload is refused with an explanation.

## 6. Admin walkthrough (`admin@apnaghar.local`)

- **Admin** tab: search users, **Make admin** / **Remove admin** (you can't remove yourself).
- Admins can see every booking and unit, and can **verify milestones**: open a project's *Progress* tab and press **Verify** (builders can't verify their own work).
- Django's own admin site: http://localhost:8000/admin/.

## 7. Optional extras

| Want | Do |
| --- | --- |
| Real LLM answers from the assistant | add a free `GROQ_API_KEY` (https://console.groq.com) to `.env`, then `make up` |
| Records anchored on Hyperledger Fabric | `make fabric`, then `make blockchain-api` (needs Docker and about 4 GB RAM) |
| Real Razorpay checkout | add Razorpay **test** keys to `.env` |
| Demo data instead of the imported data | set `IMPORT_CLOUD_EXPORT=false` in `.env`, then `make reset && make up` |
| Refresh the AI assistant after adding projects | `make rag-refresh` |

## 8. Troubleshooting

- **Port already in use**: something else is on 8080, 8000, 8001 or 5432. Stop it, or run `make down` first.
- **Phone can't connect**: `sudo ufw allow 8080/tcp`, and make sure the phone and laptop are on the same Wi-Fi.
- **Camera doesn't open on the phone**: you must use the `https://` address from `make phone`.
- **AI assistant says it's unavailable**: it's still building its index on first start. Check `make logs s=rag`.
- **Groq answers fail inside Docker with ufw**: `sudo ufw default allow routed` (lets containers reach the internet).
- **Start completely fresh**: `make reset && make up`.
