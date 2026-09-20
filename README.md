# Campus Bites 🍔

A full-stack college canteen application built with Next.js, Supabase, and Capacitor.

## 🔗 Important Deployment Links

> **Note for Developers**: If you are pushing code to GitHub and wondering why the live site isn't updating, please read this section!

### Active Production URL (Automatically Updates)
✅ **[https://campus-bites-teal.vercel.app](https://campus-bites-teal.vercel.app)**
* **Status**: Connected to this GitHub repository.
* **Behavior**: Every time code is pushed to the `main` branch, Vercel automatically builds and deploys the changes to this URL. You should use this URL to see your latest code changes (e.g. `/admin/settings`).

### Legacy URL (Does NOT Automatically Update)
❌ **[https://campusbites.vercel.app](https://campusbites.vercel.app)**
* **Status**: **NOT** connected to this GitHub repository.
* **Behavior**: This domain is hosted on a completely different Vercel account. Pushing code to this GitHub repo will **never** update this URL. If you want this URL to work again, you must log into the specific Vercel account that owns it and manually connect it to this GitHub repository.

## 📱 Android APK Generation

This project uses **Capacitor** to wrap the Next.js web application into an Android `.apk` file.

* **How it works**: A GitHub Action is configured in `.github/workflows/build-apk.yml`.
* **When it runs**: Every time code is pushed to the `main` branch, GitHub cloud servers will automatically compile the Android app using Java 21.
* **Where to find it**: Once the GitHub Action finishes, it automatically commits the generated APK file back into this repository inside the `apks/` folder (`apks/CampusBites.apk`).

## 🛠 Getting Started Locally

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
