import test from "node:test";
import assert from "node:assert/strict";
import { processShipmentEvent } from "./shipment-events.js";

test("delivered shipments with proof are recorded without sending a notice", async () => {
  const result = await processShipmentEvent({
    shipmentId: "SHP-42",
    recipient: "ops@example.com",
    status: "delivered",
    proofOfDeliveryPath: "receipts/SHP-42.pdf",
  });
  assert.deepEqual(result, { action: "record", subject: "Proof of delivery recorded", proofOfDeliveryPath: "receipts/SHP-42.pdf" });
});
