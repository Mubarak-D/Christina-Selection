import { CURRENCY } from "./config";

// Fixed locale so server and browser render the same string.
const fmt = new Intl.NumberFormat("en-LK", { style: "currency", currency: CURRENCY });

export const formatPrice = (n: number | string | null) => (n == null ? "" : fmt.format(Number(n)));
