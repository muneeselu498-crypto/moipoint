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

Real now: logins, sessions, password hashing, OTP checking, credits and prices, receipt numbers, live sync between devices, offline entries, reminders and Moi Book on a timer, the Moi Book PDF, and file storage on disk.

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

Status can be `delivered`, `read` or `failed`. A direct WhatsApp or SMS provider can also be added as another class in `messages.service.ts`.

**Before a real launch**, set `DEV_TOOLS=0` and `SEED_DEMO=0`. That turns off the Dev Outbox, stops OTP codes appearing on screen, and hides the demo logins and online payment. Use https, and set `PUBLIC_URL` to the https address so cookies are secure.

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
npm run test:prod    the app with testing tools off, as on a real server
```

They run on a throwaway database, so your data is safe. The browser tests use the Chrome installed on this computer.

## Known limits

- Receipt numbers are sequential, so someone could walk through the public receipt check pages. Mobile numbers are masked there, but names and amounts show. A random link in the QR would close this.
- A device receives its whole account history at login. This is fine for family accounts, but Master Admin will need paging once there are many customers.
- Two people editing the same record at the same moment: the last save wins. Receipt numbers and credits are protected from this.
- Live updates assume one server process. Running several needs a shared message channel.
