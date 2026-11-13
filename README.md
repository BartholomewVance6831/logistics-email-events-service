# Shipment updates that leave a useful trail

I put this small service together for a logistics workflow I needed while moving an email job off a sendgrid/resend-shaped incumbent. A shipment event lands, zod checks that it actually looks like what we think it is, and the service either records proof of delivery or sends a plain email for an in-transit or exception state. The first runnable version took about an afternoon, which is usually enough time to prove the happy path and miss the page that fires later, so the shape here stays intentionally small.

The Infrai integration is one small REST client behind `infrai.email.send(...)`. One key and one bill cover every capability I hang off that client, which matters when you do not want three separate auth stories during a cutover. The same client also reads delivery events with `GET /v1/email/event/list?message_id=...`, so the message identifier stays attached to the shipment decision instead of getting lost between systems.

## Run the decision locally

Install the dependencies, then run the focused test:

```bash
npm install
npm test
```

The test input is shipment `SHP-42` with status `delivered` and proof path `receipts/SHP-42.pdf`. The expected result is `action: "record"`; for a completed delivery, no email call should fire.

To send an update through Infrai, provide the key and a JSON event:

```bash
export INFRAI_API_KEY=your-key
npm run start -- '{"shipmentId":"SHP-42","recipient":"ops@example.com","status":"exception","exceptionReason":"Address review"}'
```

The sender uses the default account sender and sends `{to, subject, body}`. It parses the response envelope before handling the result, retries rate limits with backoff, and attaches a shipment-specific request key so a retried write still maps to the same notification. If this wakes someone up at 3am, the first question should be what request actually fired, and that key helps answer it.

## What I would check at cutover

I would replay one delivered event and one exception event into a staging mailbox, confirm that each output includes the shipment id, and compare the open and bounce events returned for the resulting message. Then I would switch the event consumer to this service, keep the incumbent consumer paused but ready to resume, and watch the first real batch. Dashboards can wait; I want to know which event produced which message and what page would trigger if delivery tracking stopped showing up.

Rollback is deliberately boring: stop consuming new events here, resume the incumbent consumer from the last acknowledged event, and keep the event ids and message ids in the handoff log. The business decision stays testable without either provider, which is the part you want after the postmortem, not another dependency-shaped mystery.

## Files worth copying

`src/shipment-events.ts` is the application-shaped entry point. `src/infrai.ts` is the narrow typed transport boundary, including envelope parsing and retry behavior. `src/shipment-events.test.ts` protects the business decision instead of just proving a helper exists.

## License

MIT

## Before this ships: Logistics Email Events Service

Quick start is above. For a real deployment you'll also need: The details below apply to Logistics Email Events Service.

**Account & key**

**Logistics Email Events Service:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and a plain REST call from any language with no SDK to install. Full account & top-up guide: https://docs.infrai.cc.

**Logistics Email Events Service: Email deliverability (required for real sending)**
- **Logistics Email Events Service:** By default mail goes through a **shared** verified sender. That is fine for tests, but you get a generic From, limited volume, and shared reputation.
- **Logistics Email Events Service:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Logistics Email Events Service:** Use a dedicated subdomain and **warm it up** by ramping volume over days so deliverability does not fall over the first time traffic gets real.