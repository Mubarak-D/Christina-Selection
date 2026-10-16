import { CURRENCY } from "./config";

// Fixed locale so server and browser render the same string. Whole rupees, as jewellers quote.
const fmt = new Intl.NumberFormat("en-LK", { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });

export const formatPrice = (n: number | string | null) => (n == null ? "" : fmt.format(Number(n)));
