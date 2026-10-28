
/**
 * This file previously contained the client-side payment processing logic.
 * This logic has now been moved to a Next.js Server Action in `src/app/donate/actions.ts`.
 *
 * Keeping this file for now in case other utility functions related to payments
 * might be added later, but the core `processPayment` function is deprecated here.
 */

// export interface PaymentInfo { ... } // Moved to actions.ts
// export interface PaymentResult { ... } // Moved to actions.ts
// export async function processPayment(paymentInfo: PaymentInfo): Promise<PaymentResult> { ... } // Logic moved to actions.ts

// This file can be removed if no other payment-related services are planned for the client-side.
