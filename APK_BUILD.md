# SnapTube Downloader - Build APK Instructions

## Step 1: Deploy to Railway

1. Go to https://railway.app
2. Sign up / Login with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your repository or upload this folder
6. Railway will automatically detect the Node.js app
7. Click "Deploy"

Your site will be live at: `https://your-project.up.railway.app`

Share this link with your friends!

---

## Step 2: Convert to APK (Android)

### Option A: Using PWABuilder (Recommended)

1. Go to https://www.pwabuilder.com
2. Enter your Railway URL: `https://your-project.up.railway.app`
3. Click "Start" and wait for analysis
4. Click "Build for stores" or "Package for stores"
5. Select "Android"
6. Download the APK file
7. Install on your phone

### Option B: Using Bubblewrap (Advanced)

1. Install Bubblewrap:
   ```bash
   npm install -g @bubblewrap/cli
   ```

2. Initialize project:
   ```bash
   bubblewrap init --manifest https://your-project.up.railway.app/manifest.json
   ```

3. Build APK:
   ```bash
   bubblewrap build
   ```

### Option C: Using AppMySite (No Code)

1. Go to https://www.appmysite.com
2. Create account
3. Enter your website URL
4. Customize the app design
5. Download the APK

---

## Step 3: Install APK on Android

1. Transfer the APK to your phone
2. Go to Settings > Security > Unknown Sources (enable)
3. Tap on the APK file
4. Follow installation prompts
5. Done! SnapTube is now on your phone

---

## Files Structure for Railway:

```
snap/
├── server.js             # Main server
├── sw.js                 # Service Worker for PWA
├── downloads/            # Downloads folder
├── index.html            # Frontend
├── styles.css            # Styles
├── script.js             # JavaScript
├── package.json          # Dependencies
├── railway.json          # Railway config
├── vercel.json           # Vercel config (alternative)
└── README.md             # Documentation
```

---

## Important Notes:

1. Railway free tier has limits (512MB RAM, 1GB disk)
2. For production use, upgrade to Railway Pro
3. Make sure to add your Railway domain to CORS if needed
4. The APK will work like a native app but still requires internet

---

## Customization:

- Change app name in `server.js` (line with manifest.json)
- Change app icon (add icon-192.png and icon-512.png)
- Change colors in `styles.css`
- Add more platforms in `SUPPORTED_PLATFORMS` array
