# ProConnect — Free Deployment Guide
### Stack: Node.js + MySQL + Socket.io
### Platform: Render.com (backend) + Aiven.io (MySQL)
### Cost: $0 | No credit card required

---

## Why NOT Vercel?
Your app uses **Socket.io** for real-time chat. Vercel is serverless — it
kills connections after a few seconds, which breaks Socket.io entirely.
**Render.com** runs a real Node.js server, so Socket.io works perfectly.

---

## STEP 1 — Push to GitHub (run in your terminal)

Open a terminal, `cd` into your project folder, and run:

```bash
cd /path/to/Proconnect

# Stage all changes
git add backend/.env.example render.yaml
git add backend/config/db.js backend/server.js

# Commit
git commit -m "Add render.yaml + restore .env.example"

# Push
git push origin main
```

If push asks for SSH key, use HTTPS instead:
```bash
git remote set-url origin https://github.com/rajroshan0/ProConnect-Social-network-webapp.git
git push origin main
```

---

## STEP 2 — Free MySQL Database on Aiven.io

1. Go to **https://aiven.io** → Click **"Start free"**
2. Sign up with your Google/GitHub account (no credit card)
3. Click **"+ Create service"** → Choose **MySQL**
4. Select the **Free plan** (300 MB storage)
5. Pick any cloud region close to you → Click **"Create free MySQL"**
6. Wait ~2 minutes for it to start
7. Click your new MySQL service → Go to **"Overview"** tab
8. Copy these values (you'll need them for Render):
   - **Host** (e.g., `mysql-xxx.aivencloud.com`)
   - **Port** (e.g., `23948`)
   - **User** (`avnadmin`)
   - **Password** (click the eye icon to reveal)
   - **Database** (`defaultdb`)

### Import your schema into Aiven:
9. In Aiven, go to **"Overview"** → scroll down → click **"Connect"**
10. Choose **"MySQL client"** and copy the connection command
11. Run it in your terminal, then paste your schema:
```bash
mysql -h YOUR_HOST -P YOUR_PORT -u avnadmin -p --ssl-mode=REQUIRED defaultdb < database/schema.sql
```

---

## STEP 3 — Deploy Backend on Render.com

1. Go to **https://render.com** → Click **"Get Started for Free"**
2. Sign up with **GitHub** (no credit card needed)
3. Click **"+ New"** → **"Web Service"**
4. Click **"Connect a repository"** → Find **ProConnect-Social-network-webapp**
5. Fill in the settings:
   - **Name**: `proconnect-api`
   - **Root Directory**: `backend`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: **Free**

6. Scroll down to **"Environment Variables"** → Add these one by one:

| Key | Value |
|-----|-------|
| `PORT` | `3000` |
| `DB_HOST` | *(your Aiven host)* |
| `DB_PORT` | *(your Aiven port, e.g. 23948)* |
| `DB_USER` | `avnadmin` |
| `DB_PASSWORD` | *(your Aiven password)* |
| `DB_NAME` | `defaultdb` |
| `JWT_SECRET` | `proconnect_super_secret_2024_xyz` |
| `JWT_EXPIRES_IN` | `7d` |

7. Click **"Create Web Service"**
8. Render will build and deploy automatically (~3-5 minutes)
9. Your live URL will be: `https://proconnect-api.onrender.com`

---

## STEP 4 — Fix the MySQL SSL Connection for Aiven

Aiven requires SSL. Add this one line to `backend/config/db.js`:

```javascript
const pool = mysql.createPool({
    host:     process.env.DB_HOST,
    port:     process.env.DB_PORT,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },  // <-- ADD THIS LINE
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});
```

Then commit and push — Render will auto-redeploy.

---

## STEP 5 — Update Frontend API URL

In all your HTML files, find the API base URL and change it to your Render URL.

Search for `localhost:3000` in your frontend files and replace with:
```
https://proconnect-api.onrender.com
```

Files to update: `login.html`, `register.html`, `feed.html`, `profile.html`, `messages.html`, `admin.html`

---

## Done! Your app is live at:
**https://proconnect-api.onrender.com**

---

## Troubleshooting

**App sleeping?**  
Render free tier sleeps after 15 minutes of inactivity. First request after sleeping takes ~30 seconds. This is normal on the free plan.

**MySQL connection refused?**  
Make sure you added `ssl: { rejectUnauthorized: false }` to db.js. Aiven requires SSL.

**Push rejected (Permission denied)?**  
Switch to HTTPS remote:
```bash
git remote set-url origin https://github.com/rajroshan0/ProConnect-Social-network-webapp.git
```

**Socket.io not connecting?**  
In your frontend `messages.html`, update the socket connection URL:
```javascript
const socket = io('https://proconnect-api.onrender.com');
```
