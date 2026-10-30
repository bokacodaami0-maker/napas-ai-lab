# NAPAS AI LAB — সম্পূর্ণ গাইড (বাংলায়)

> ⚠️ সততার কথা: এই প্রজেক্ট `npm run build` করে আমি যাচাই করতে পারিনি (আমার পরিবেশে ইন্টারনেট বন্ধ ছিল)। কোডের সিনট্যাক্স পরীক্ষা করা হয়েছে, কিন্তু প্রথম বিল্ড ও লাইভ টেস্ট আপনাকেই করতে হবে। নিচে ধাপে ধাপে লেখা আছে।

## ১. ফাইল কোথায় কী আছে
| ফাইল | কাজ |
|---|---|
| `src/firebase.js` | Firebase কনফিগ (আপনার প্রজেক্ট `my-first-web-ea0e2`) |
| `src/AuthContext.jsx` | Google/Email লগইন, রেজিস্টার, পাসওয়ার্ড রিসেট, অ্যাডমিন চেক |
| `src/AuthPage.jsx` | লগইন / রেজিস্টার / Forgot Password পেজ (Apple লগইন নেই) |
| `src/SearchBar.jsx` | সার্চ বার — নিচে অটো সাজেশন আসে |
| `src/pages/` | Home, Courses, Orders (My Orders + My Money), Static (About, YouTube, Contact), Admin |
| `src/App.jsx` | নেভিগেশন ও সব রুট (`/`, `/courses`, `/course/html-css`, `/about`, `/youtube`, `/login`, `/register`, `/my-orders`, `/my-money`, `/contact`, `/admin`) |
| `public/napas.png` | আপনার ছবি (ব্যাকগ্রাউন্ড ছাড়া, স্যুট সহ) |
| `public/_redirects`, `netlify.toml` | Netlify-তে পেজ রিফ্রেশ করলেও যেন ঠিক থাকে (SPA routing) |
| `firestore.rules`, `storage.rules` | ডাটাবেস ও স্টোরেজের সিকিউরিটি রুলস |

## ২. Firebase সেটআপ (একবারই)
Firebase Console → আপনার প্রজেক্ট **NAPAS AI LAB**:
1. **Authentication → Sign-in method**: `Google` (চালু আছে) এবং **`Email/Password` চালু করুন**।
2. **Firestore Database → Create database** (Production mode)। তারপর **Rules** ট্যাবে `firestore.rules` ফাইলের পুরো লেখা পেস্ট করে **Publish** করুন।
3. **Storage → Get started** (ছবি আপলোডের জন্য)। এরপর **Rules**-এ `storage.rules` পেস্ট করে Publish করুন।
   - যদি Firebase Storage চালু করতে Blaze (কার্ড) প্ল্যান চায়, চালু না করলেও চলবে — অ্যাডমিন প্যানেলে ছবির **URL পেস্ট** করা যাবে।
4. **Authentication → Settings → Authorized domains**: **Add domain** চেপে আপনার Netlify ঠিকানা যোগ করুন (যেমন `your-site.netlify.app` এবং নিজের ডোমেইন থাকলে সেটিও)। এটা না করলে লাইভ সাইটে Google লগইন কাজ করবে না।

## ৩. প্রথম Admin বানানোর নিরাপদ নিয়ম
কেউ ওয়েবসাইট থেকে নিজেকে অ্যাডমিন বানাতে পারে না (Rules `admins` কালেকশনে লেখা বন্ধ রেখেছে)। শুধু আপনি Console থেকে বানাতে পারবেন:
1. ওয়েবসাইটে আপনার নিজের Google/Email দিয়ে একবার লগইন করুন।
2. Firebase Console → **Authentication → Users** → আপনার ইমেইলের পাশে **User UID** কপি করুন।
3. **Firestore Database → Start collection** → Collection ID: `admins` → Document ID: **আপনার UID পেস্ট করুন** → একটি ফিল্ড দিন: `role` = `admin` → Save।
4. ওয়েবসাইটে Logout করে আবার Login করুন। মেনুতে **Admin** দেখা যাবে।
(অন্য অ্যাডমিন যোগ করতে একইভাবে তার UID দিয়ে ডকুমেন্ট বানান; সরাতে ডকুমেন্ট মুছুন।)

## ৪. Netlify-তে আপলোড — কী আপলোড করবেন?
**সবচেয়ে সহজ ও নিরাপদ (পরামর্শ): GitHub দিয়ে**
1. `napas-ai-lab-project.zip` আনজিপ করুন → পুরো ফোল্ডার GitHub রিপোজিটরিতে আপলোড করুন।
2. Netlify → **Add new site → Import from Git** → রিপো বাছুন। Build command `npm run build`, Publish directory `dist` (এগুলো `netlify.toml` থেকেই আসবে) → **Deploy**।

**ZIP/ফোল্ডার ড্র্যাগ করে (Drag & Drop):** Netlify-তে *সোর্স ZIP আপলোড করলে চলবে না* — শুধু বিল্ড করা **`dist` ফোল্ডার** আপলোড করতে হবে। কম্পিউটারে Node.js (v20) ইনস্টল থাকলে:
```
npm install
npm run build
```
তারপর যে `dist` ফোল্ডার তৈরি হবে সেটি Netlify → **Sites → Add new site → Deploy manually**-এ ড্র্যাগ করুন।
> `dist` ফোল্ডার আমি তৈরি করতে পারিনি, কারণ আমার পরিবেশে প্যাকেজ ইনস্টল করা যায়নি।

## ৫. Admin Guide (একদম নতুনদের জন্য)
**১) Admin Login:** `/login` পেজে আপনার অ্যাডমিন অ্যাকাউন্ট দিয়ে Google বা Email লগইন করুন।
**২) Dashboard কোথায়:** লগইনের পর উপরের মেনুতে **Admin** চাপুন (অথবা ঠিকানায় `/admin`)। বামে (মোবাইলে উপরে) ট্যাব: Dashboard, Orders, Refunds, Courses, Users, Notices, Support, Settings, Audit Log।
**৩) নতুন Course Add:** Admin → **Courses** → প্রথমবার **“Default কোর্স তৈরি করুন”** চাপলে HTML & CSS কোর্স তৈরি হবে (এটা না করলে Courses পেজ ফাঁকা থাকবে)। নতুন কোর্সে **+ Add Course** → নাম, মূল্য, ছবি (আপলোড/URL), ভিডিও লিংক, বিবরণ, Syllabus লিখে **Save**।
**৪) Price Change:** Courses → কোর্সের পাশে **Edit** → Price বদলে **Save**। (সার্ভার রুলস নিশ্চিত করে — student অন্য দামে Order দিতে পারবে না।)
**৫) Enrollment দেখা:** **Orders** ট্যাবে সব Order; Order ID/TrxID/ইমেইল দিয়ে সার্চ করা যায়। **Users** → ইউজারের **Details** চাপলে তার Enrollment দেখা যাবে।
**৬) Payment Verify:** আগে bKash/Nagad অ্যাপ খুলে দেখুন ওই **TrxID ও টাকার অঙ্ক** সত্যিই এসেছে কি না। মিললে Orders-এ **DONE (Verify)**। না মিললে **Reject**। (ওয়েবসাইট নিজে bKash/Nagad-এর সাথে মিলিয়ে দেখতে পারে না — এই যাচাই আপনাকে নিজেই করতে হবে। একই TrxID দুইবার এলে ⚠ Duplicate সতর্কতা দেখাবে।)
**৬-ক) Verify করলে** Payment `verified` ও Enrollment `active` হয় — তখনই student-এর কোর্স চালু গণ্য হয়।
**৭) Approve/Reject/Cancel/Complete:** Orders-এর প্রতিটি কার্ডে বাটন: **DONE (Verify)**, **Reject**, **Mark Completed**, **CANCEL**, **REFUND**। প্রতিটি কাজ আগে Confirm চায় এবং Audit Log-এ লেখা হয়।
**৮) Refund:** **Refunds** ট্যাবে Student-এর অনুরোধ → **Approve** বা **Reject**। Approve করার পর আপনি নিজে bKash/Nagad-এ টাকা ফেরত পাঠান, তারপর **Mark Refund Completed** চেপে ফেরত পাঠানোর **Transaction ID** লিখুন। TrxID ছাড়া Completed হবে না — টাকা ফেরত দেওয়ার আগে কখনো Completed করবেন না।
**৯) User ও Notice:** **Users** → Search, **Block/Unblock**। **Notices** → শিরোনাম ও বিবরণ লিখে **Publish**; মুছতে **Delete**। **Support** → Student-এর মেসেজের নিচে উত্তর লিখে **Reply** (Student Contact পেজে উত্তর দেখবে)। **Settings** → সাইটের নাম, লোগো, bKash/Nagad নম্বর, পেমেন্ট নির্দেশনা, সোশ্যাল লিংক।
**১০) সমস্যা হলে:**
- *Admin বাটন দেখা যাচ্ছে না:* ধাপ ৩ আবার দেখুন — `admins` ডকুমেন্টের ID অবশ্যই আপনার UID হতে হবে; তারপর Logout/Login।
- *পাসওয়ার্ড ভুলে গেলে:* লগইন পেজে **“পাসওয়ার্ড ভুলে গেছেন?”** → ইমেইলে লিংক আসবে (Spam দেখুন)। Google দিয়ে লগইন করলে পাসওয়ার্ড লাগে না।
- *Google লগইন লাইভে কাজ করছে না:* ধাপ ২(৪) — Authorized domain যোগ করুন।
- *“ব্যর্থ: permission-denied”:* Firestore Rules Publish হয়নি বা আপনি অ্যাডমিন নন।

## ৬. যা এখনো করা হয়নি / সীমাবদ্ধতা
- bKash/Nagad API দিয়ে অটো-পেমেন্ট যাচাই নেই — ম্যানুয়াল যাচাই।
- অ্যাডমিন-রোল Firestore Rules দিয়ে সার্ভার-সাইডে বলবৎ হয়; আলাদা Cloud Functions/Custom Claims ব্যবহার করা হয়নি (Blaze প্ল্যান লাগত না, তাই এভাবে)।
- আপনার আগের মুনলিট-ঘাসের ব্যাকগ্রাউন্ড ছবি ফাইল আমি পাইনি; তাই ডিজাইনে CSS গ্র্যাডিয়েন্ট ও জোনাকি ইফেক্ট। ছবি পাঠালে বসিয়ে দেব।
- কোর্সের ভিডিও হোস্টিং নেই; শুধু লিংক।
