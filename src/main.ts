import { processShipmentEvent } from "./shipment-events.js";

const input = process.argv[2];
if (!input) throw new Error("Pass a shipment event as JSON");

const result = await processShipmentEvent(JSON.parse(input));
console.log(JSON.stringify(result, null, 2));
