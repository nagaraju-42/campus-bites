# Campus Bites — Environment Variables Reference

> This file documents what each variable is and where to find it.
> Actual secret values live in .env.local (local) and Vercel Dashboard (production).

---

## Supabase

| Variable | Where to find | Notes |
|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase Dashboard ? Settings ? API | Public |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase Dashboard ? Settings ? API | Public anon key |
| SUPABASE_SERVICE_ROLE_KEY | Supabase Dashboard ? Settings ? API | SECRET - server only |

---

## Firebase Cloud Messaging (FCM)

| Variable | Where to find |
|---|---|
| FIREBASE_PROJECT_ID | Firebase Console ? Project Settings ? General |
| FIREBASE_CLIENT_EMAIL | Firebase Console ? Project Settings ? Service Accounts ? Generate Key |
| FIREBASE_PRIVATE_KEY | Same JSON from Service Accounts - full BEGIN/END PRIVATE KEY block |
| NEXT_PUBLIC_FIREBASE_API_KEY | Firebase Console ? Project Settings ? General ? Web API Key |
| NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN | Firebase Console ? Project Settings ? General |
| NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID | Firebase Console ? Project Settings ? Cloud Messaging |
| NEXT_PUBLIC_FIREBASE_APP_ID | Firebase Console ? Project Settings ? Your Apps |
| NEXT_PUBLIC_FIREBASE_VAPID_KEY | Firebase Console ? Project Settings ? Cloud Messaging ? Web Push Certificates |

---

## VAPID Keys (Web Push for PWA)

| Variable | Notes |
|---|---|
| NEXT_PUBLIC_VAPID_PUBLIC_KEY | Generated via: npx web-push generate-vapid-keys |
| VAPID_PRIVATE_KEY | SECRET - same command output |
| VAPID_SUBJECT | e.g. mailto:admin@campusbites.com |

---

## App Config

| Variable | Value |
|---|---|
| NEXT_PUBLIC_APP_URL | https://campus-bites-teal.vercel.app |

---

## APK Info

- Shop Owner APK package: com.campusbites.shop
- Firebase Project: dinendeliver-41b5e
- APK build command: cd android && gradlew clean assembleDebug
- APK output: android/app/build/outputs/apk/debug/app-debug.apk
- google-services.json location: android/app/google-services.json

---

## Vercel - Variables to ADD (not yet in dashboard)

NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_VAPID_KEY

## Vercel - Variables to UPDATE (already exist, update with new values)

FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY

---

## Quick Setup Checklist

- [ ] .env.local filled with all values
- [ ] android/app/google-services.json present
- [ ] All Vercel env vars set
- [ ] Vercel redeployed after env changes
- [ ] apk_devices table created in Supabase (run scripts/create_apk_devices_table.sql)
