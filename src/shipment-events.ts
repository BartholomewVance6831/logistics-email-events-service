import { z } from "zod";
import { infrai, type EmailResult } from "./infrai.js";

export const shipmentEventSchema = z.object({
  shipmentId: z.string().min(1),
  recipient: z.string().email(),
  status: z.enum(["in_transit", "delivered", "exception"]),
  proofOfDeliveryPath: z.string().min(1).optional(),
  exceptionReason: z.string().min(1).optional(),
});

export type ShipmentEvent = z.infer<typeof shipmentEventSchema>;
export type ShipmentDecision = { action: "notify" | "record"; subject: string; proofOfDeliveryPath?: string; message?: EmailResult };

export async function processShipmentEvent(input: unknown): Promise<ShipmentDecision> {
  const event = shipmentEventSchema.parse(input);
  if (event.status === "delivered" && event.proofOfDeliveryPath) {
    return { action: "record", subject: "Proof of delivery recorded", proofOfDeliveryPath: event.proofOfDeliveryPath };
  }
  const subject = event.status === "exception" ? `Shipment ${event.shipmentId} needs attention` : `Shipment ${event.shipmentId} is on the way`;
  const body = event.status === "exception"
    ? `Shipment ${event.shipmentId} has an exception: ${event.exceptionReason ?? "review required"}.`
    : `Shipment ${event.shipmentId} is currently in transit.`;
  const message = await infrai.email.send({ to: event.recipient, subject, body }, `shipment-${event.shipmentId}-${event.status}`);
  return { action: "notify", subject, message };
}
