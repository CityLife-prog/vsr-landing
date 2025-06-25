### **Fix Gmail App Password Issue (for vsrsnow\.com)**

Enable App Passwords:

1. Go to: [admin.google.com](https://admin.google.com)
2. Login to the admin account
2. Go to: `Security > Access and data control > Less secure apps & your users`
3. Turn ON:

   * Allow users to manage access to less secure apps
   * Allow App Passwords
4. Make sure 2-Step Verification is ON
5. Then go to: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

---

### **Fix Vercel Domain Issue**

**1. Log into where you bought your domain**
(e.g., GoDaddy, Google Domains, Namecheap)

**2. Add this TXT record:**

* **Type:** `TXT`
* **Name:** `_vercel` *(or `_vercel.vsrsnow.com` if using Cloudflare)*
* **Value:** `vc-domain-verify=vsrsnow.com,a8945cb356f52c2e7ef6`

**3. Wait 5–60 mins** for DNS to update  
Check here: [whatsmydns.net](https://whatsmydns.net/#TXT/_vercel.vsrsnow.com)

---

