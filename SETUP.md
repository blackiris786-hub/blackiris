# بلاك آيريس - دليل الإعداد

## المتطلبات

- Node.js 18+
- npm أو yarn
- حساب Supabase
- حساب Google Cloud (اختياري - للـ OAuth)
- حساب hCaptcha (اختياري - للحماية)

## خطوات سريعة

```bash
# تثبيت المكتبات
npm install

# انسخ ملف البيئة
cp .env.example .env
```

بعدين افتح `.env` وملأ القيم.

## 1. إعداد قاعدة البيانات

اختار واحدة من الطريقتين:

### الطريقة الأولى: Supabase CLI (الأسهل)

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

### الطريقة الثانية: يدوي

روح Supabase Dashboard > SQL Editor وشغّل الملف:
```
supabase/migrations/20260306131202_create_blackiris_schema.sql
```

## 2. إعداد Google OAuth

بدك تعمل ده لما تبي تسجيل دخول حقيقي بالجوجل.

1. روح [Google Cloud Console](https://console.cloud.google.com)
2. اعمل مشروع جديد (اسمه "Blackiris")
3. فعّل **Google+ API**
4. روح **Credentials** واعمل OAuth 2.0 (Web Application)
5. ضيف هذه الروابط تحت "Authorized redirect URIs":
   ```
   https://black-iris-org.web.app/auth/v1/callback
   http://localhost:5174
   ```
6. نسخ ال Client ID وحط بتاعه في `.env` (VITE_GEMINI_API_KEY)
7. في Supabase Dashboard > Authentication > Providers > Google، حط الـ credentials

## 3. إعداد hCaptcha (حماية من البوتات)

شيء اختياري بس مفيد جداً.

1. روح [hCaptcha.com](https://www.hcaptcha.com)
2. اعمل حساب وسجل الدومين
3. نسخ **Site Key** و **Secret Key**
4. في `.env`، حط Site Key بـ `VITE_HCAPTCHA_SITE_KEY`
5. في Supabase Dashboard > Project Settings > Secrets:
   ```
   اعمل secret جديد اسمه HCAPTCHA_SECRET وحط Secret Key فيه
   ```

## 4. إعدادات التوثيق

في Supabase Dashboard > Authentication > Settings:

- قفّل "Enable email confirmations" (للتطوير)
- للإنتاج، استخدم SendGrid أو أي خدمة إيميل

## 5. متغيرات البيئة المهمة

في `.env`:

```env
# Supabase - ضروري
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-key-here
VITE_SUPABASE_REDIRECT_URL=https://black-iris-org.web.app

# Gemini AI - ضروري
VITE_GEMINI_API_KEY=your-api-key
GEMINI_API_KEY=your-api-key

# hCaptcha - اختياري
VITE_HCAPTCHA_SITE_KEY=your-site-key

# Firebase - اختياري
VITE_FIREBASE_PROJECT_ID=your-id
VITE_FIREBASE_API_KEY=your-key
```

## التشغيل

### التطوير
```bash
npm run dev
# سيفتح على http://localhost:5174
```

### الإنتاج
```bash
npm run build
firebase deploy --only hosting
```

## حل المشاكل الشائعة

**ما بيشتغل التسجيل:**
- تأكد من `.env` صحيح
- الـ Supabase project ما متوقف
- جرّب الـ network tab في الـ Developer Tools

**صور النباتات ما بتتحقق:**
- تأكد من Gemini API key صحيح
- شوف الـ console للأخطاء

**الـ hCaptcha ما بيظهر:**
- تأكد Site Key صحيح
- الدومين مسجل في hCaptcha

## النشر على الإنترنت

### Firebase Hosting
```bash
npm run build
firebase deploy --only hosting
```

### Supabase Edge Functions
```bash
npx supabase functions deploy verify-plant
```

---

الحمد لله على التوفيق! استمتع بالتطوير 🌱
