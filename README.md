# Moi Point

Records every Moi at a family function, sends receipts, and closes the accounts the same night.

Munees's screens and business rules are kept as they were. A NestJS server and a PostgreSQL database now sit underneath them, so several phones and laptops share the same data in real time.

## Run it

Double-click `start-local.bat`, or run:

```
npm install
npm start
```

The first run takes a few minutes. Then open:

| What | Where |
| --- | --- |
| The app | http://localhost:4600 |
| Every message the app would send | http://localhost:4600/dev/outbox |

You need Node.js 20 or newer and PostgreSQL 16 installed. Moi Point runs its own private database on port 5544, in the `.local` folder, and does not touch your other databases.

### Try it on a phone

Connect the phone to the same Wi-Fi as the laptop. The server prints an address when it starts, such as `http://192.168.1.5:4600`. Open that on the phone. Windows may ask you to allow Node.js through the firewall.

Voice typing and the "install app" prompt need https, so they only work on `localhost` or a real domain, not on that Wi-Fi address.

### Test logins

| Role | Email | Password |
| --- | --- | --- |
| Owner | ramesh.kumar@gmail.com | admin123 |
| Event Admin | divya.sankar@gmail.com | divya123 |
| Moi Collector | raj.moi@gmail.com | raj123 |
| Master Admin | master@moipoint.in | master123 |

These are demo data and exist only when `SEED_DEMO=1`.

To start over with clean demo data, stop the app and run `npm run reset`.

## What is real and what is simulated

Real now: logins, sessions, password hashing, OTP checking, credits and prices, receipt numbers, live sync between devices, offline entries that survive a failed send, reminders and Moi Book on a timer, the Moi Book PDF, and file storage on disk.

Simulated until the client's accounts are connected:

| Service | Today | What connects it |
| --- | --- | --- |
| WhatsApp, SMS and email | Written to the Dev Outbox. OTP codes also show on screen | `MESSAGE_PROVIDER`, in `apps/api/src/messages.service.ts` |
| Buying credits and plans | "Simulate payment" succeeds with no money | `PAYMENT_PROVIDER`, in `apps/api/src/account.controller.ts` |
| Online Moi from guests | Simulated in testing, hidden in production | Same gateway |

## Connecting the client's services

All settings live in `apps/api/.env`. See `apps/api/.env.example` for the full list. Never commit that file or paste keys in a chat.

**Messages.** Set `MESSAGE_PROVIDER=webhook`, `MESSAGE_WEBHOOK_URL` and `MESSAGE_WEBHOOK_SECRET`. Each message is POSTed as JSON, with the secret in the `x-moipoint-secret` header:

```json
{ "id": "...", "trigger": "C1", "channel": "WhatsApp", "to": "9876512345", "text": "...", "vars": { "guest": "...", "amount": "₹1,001", "event": "...", "receipt": "EV003/016" }, "media": null }
```

`trigger` is the ID from the automation report, and `vars` holds the template values. Answer with `{ "ref": "provider-message-id" }`.

Delivery reports and replies come back to `POST /api/webhooks/messages`, with the same header:

```json
{ "ref": "provider-message-id", "status": "delivered" }
{ "from": "9876512345", "text": "STOP" }
```

Status can be `delivered`, `read` or `failed`. Photos arrive in `media.image` and the Moi Book PDF in `media.document.url`, as full web addresses. The calendar invite (M5) carries its file as text in `media.document.text`.

If the webhook is down or takes over 15 seconds to answer, the server tries again every 30 seconds for 10 minutes, then marks the message failed. A retry keeps the same `id`, so use it to ignore repeats. A direct WhatsApp or SMS provider can also be added as another class in `messages.service.ts`.

**Before a real launch**, set `DEV_TOOLS=0` and `SEED_DEMO=0`. That turns off the Dev Outbox, stops OTP codes appearing on screen, and hides the demo logins and online payment. Use https, and set `PUBLIC_URL` to the https address so cookies are secure. If nginx or another proxy sits in front, set `TRUST_PROXY=1`.

The Moi Book PDF needs Chrome or Edge on the server. Set `CHROME_PATH` if it isn't in the usual place.

A real install starts with no logins. Add the first Master Admin with the command below. It prints a one-time password, so change it after logging in.

```
npm run admin:create -- "Full Name" name@example.com 9876543210
```

## How it works

```
apps/
  web/   The app the browser loads. src/js holds the original screens, joined in the
         fixed order in src/js/order.json. 90-server.js is the only file that talks to the server.
  api/   NestJS server and Prisma schema.
scripts/ start, database and test helpers.
tests/   Server rules and real-browser tests.
```

The screens work on one object, `S`, and call `save()` after each change. `90-server.js` loads `S` from the server, sends what changed after each save, and merges in what other devices changed. The screens never needed to know.

The server treats every browser as untrusted. It decides who sees what (`whereFor` in `sync.service.ts`) and checks every write against the person's role. It alone hands out receipt numbers, charges credits and checks OTP codes.

`npm run build:web` rebuilds the page after a change in `apps/web/src`.

## Tests

```
npm test             everything
npm run test:api     server rules only
npm run test:ui      real browser tests only
npm run test:prod    testing tools off and a stand-in provider, as on a real server
```

They run on a throwaway database, so your data is safe. The browser tests use the Chrome installed on this computer.

## Known limits

- Receipt numbers are sequential, so someone could walk through the public receipt check pages. Mobile numbers are masked there, but names and amounts show. A random link in the QR would close this.
- A device receives its whole account history at login. This is fine for family accounts, but Master Admin will need paging once there are many customers.
- The password hint on Forgot password shows the first and last two characters to anyone who knows the customer's email. It was agreed on the call, so it stays until Munees decides. Staff logins never show it, and Master Admin can switch it off for everyone.
- Changing your email or mobile in Profile isn't confirmed by a code.
- Staff roles are enforced for changes. Reading is not limited by role yet, so every staff login can read all customer data through the server, even where the screens hide it.
- Two people editing the same record at the same moment: the last save wins. Receipt numbers and credits are protected from this.
- Live updates and message retries assume one server process. Running several needs a shared message channel.
- A message that fails after every retry keeps its credit. Refunding it is an open decision in the automation report.
