# AegisUAV-7LSP: Military 7-Layer UAV Security & C2 System

Military-grade 7-layer mutual cryptographic security protocol, real-time UAV Command & Control, autonomous threat detection, and multi-sensor data fusion.

---

## 🛠️ 1. Local Setup on Windows (VS Code)

### Step 1: Install Dependencies
If you previously faced `ERESOLVE` due to `esbuild`, that conflict has been fixed in `package.json`. Run:
```cmd
npm install
```

*(Note: If you still have older node_modules or cached lockfiles on Windows, run `npm install --legacy-peer-deps`)*

### Step 2: Start Development Server
```cmd
npm run dev
```
Open **`http://localhost:3000`** in your browser.

---

## 🚀 2. Deploy to Vercel

### Option A: Via GitHub (Recommended)
1. Push this project to your GitHub repository:
   ```cmd
   git init
   git add .
   git commit -m "AegisUAV 7-Layer Security C2 System"
   git branch -M main
   git remote add origin https://github.com/your-username/aegisuav-7lsp.git
   git push -u origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/new).
3. Import your GitHub repository.
4. Framework Preset: **Vite**
5. Build Command: `npm run build`
6. Output Directory: `dist`
7. Click **Deploy**!

### Option B: Via Vercel CLI
```cmd
npm install -g vercel
vercel
```

---

## 💻 3. Multi-Laptop Demonstration Workflow

### Laptop 1 (Ground C2 Server):
1. Open the website on Laptop 1.
2. Select **SERVER (C2)** in the top bar.
3. Click **"CLAIM EXCLUSIVE SERVER (LAPTOP 1)"**.
4. Fly the drone using the joystick or keyboard (`W`/`S` for pitch, `A`/`D` for roll, `Q`/`E` for yaw, `Arrow Up/Down` for throttle).

### Laptop 2 (Airborne Drone Client):
1. Open the website on Laptop 2.
2. Select **CLIENT (UAV)** in the top bar.
3. Watch the tactical Head-Up Display (HUD) and radar map respond in real time as Laptop 1 controls the drone!
4. Inspect the 7-Layer incoming cryptographic decryption logs in real time.

### Laptop 3 (Adversary / Rogue Hacker):
1. Open the website on Laptop 3.
2. Attempt to claim the server role or send rogue commands.
3. **The system immediately rejects Laptop 3 with Rule L6 (Single Server Lock) and Rule L3 (IP Mismatch)!**
4. Laptop 1 and Laptop 2 receive instant red alert klaxon notifications of the thwarted intrusion.
