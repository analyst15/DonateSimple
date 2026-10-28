
'use server';

/**
 * @fileOverview Server actions for handling donations.
 */
import { db } from '@/lib/firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

/**
 * Represents payment information.
 */
export interface PaymentInfo {
  /**
   * The payment amount.
   */
  amount: number;
  /**
   * The currency of the payment.
   */
  currency: 'USD' | 'GBP' | 'KES';
  /**
   * The donor's first name.
   */
  firstName: string;
  /**
   * The donor's last name.
   */
  lastName: string;
  /**
   * The donor's email address.
   */
  email: string;
  /**
   * The donor's phone number (including country code).
   */
  phoneNumber: string;
  /**
   * The frequency of the donation.
   */
  frequency: 'one-time' | 'annually';
  /**
   * The selected payment method.
   */
  paymentMethod: 'card' | 'paypal' | 'mpesa';
  /**
   * An optional message from the donor.
   */
  message?: string;
  /**
   * Optional card details if payment method is 'card'.
   */
  cardDetails?: {
    cardNumber: string;
    cardExpiry: string; // MM/YY
    cardCvv: string;
  };
}

/**
 * Represents the result of a payment processing attempt.
 */
export interface PaymentResult {
  /**
   * Indicates whether the payment was successful.
   */
  success: boolean;
  /**
   * A message providing additional information about the payment result.
   */
  message: string;
  /**
   * Optional transaction ID if successful.
   */
  transactionId?: string;
  /**
   * Optional Firestore document ID if write was successful.
   */
  donationId?: string;
}

/**
 * Asynchronously processes a donation via a Server Action.
 *
 * @param paymentInfo The payment information to process.
 * @returns A promise that resolves to a PaymentResult object indicating the success or failure of the payment.
 */
export async function processDonationAction(paymentInfo: PaymentInfo): Promise<PaymentResult> {
  try {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Basic validation simulation
    if (paymentInfo.amount <= 0) {
      console.error('Donation validation error: Invalid payment amount.', paymentInfo.amount);
      return {
        success: false,
        message: 'Invalid payment amount.',
      };
    }
    if (!paymentInfo.firstName || !paymentInfo.lastName) {
      console.error('Donation validation error: First name and last name are required.', {
        firstName: paymentInfo.firstName,
        lastName: paymentInfo.lastName,
      });
      return {
        success: false,
        message: 'First name and last name are required.',
      };
    }
    if (!paymentInfo.email) {
      console.error('Donation validation error: Email address is required.');
      return {
        success: false,
        message: 'Email address is required.',
      };
    }
    if (!paymentInfo.phoneNumber) {
      console.error('Donation validation error: Phone number is required.');
      return {
        success: false,
        message: 'Phone number is required.',
      };
    }

    let message: string;
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Simulate payment processing
    if (paymentInfo.paymentMethod === 'card') {
      if (!paymentInfo.cardDetails || !paymentInfo.cardDetails.cardNumber || !paymentInfo.cardDetails.cardExpiry || !paymentInfo.cardDetails.cardCvv) {
        console.error('Donation payment error: Incomplete card details provided for card payment.');
        return {
          success: false,
          message: 'Card details are required for card payment.',
        };
      }
      if (paymentInfo.cardDetails.cardNumber === '1111111111111111') { // Example "declined" card
        console.error('Donation payment error: Card declined by payment gateway.', { transactionId });
        return {
          success: false,
          message: 'Your card was declined. Please try another card or payment method.',
        };
      }
      message = `Card payment of ${paymentInfo.currency} ${paymentInfo.amount.toFixed(2)} (${paymentInfo.frequency}) processed successfully. Thank you, ${paymentInfo.firstName}!`;
    } else if (paymentInfo.paymentMethod === 'paypal') {
      message = `Your donation of ${paymentInfo.currency} ${paymentInfo.amount.toFixed(2)} (${paymentInfo.frequency}) is being processed. You will be (mock) redirected to PayPal to complete your payment.`;
    } else if (paymentInfo.paymentMethod === 'mpesa') {
      message = `M-PESA payment of ${paymentInfo.currency} ${paymentInfo.amount.toFixed(2)} (${paymentInfo.frequency}) initiated for ${paymentInfo.phoneNumber}. A (mock) USSD prompt will be sent. Thank you, ${paymentInfo.firstName}!`;
    } else {
      console.error(`Donation payment error: Unsupported payment method: ${(paymentInfo as any).paymentMethod}`);
      return {
        success: false,
        message: `Unsupported payment method: ${paymentInfo.paymentMethod}`,
      };
    }

    // If payment simulation is successful, write to Firestore
    try {
      const donationData = {
        firstName: paymentInfo.firstName,
        lastName: paymentInfo.lastName,
        email: paymentInfo.email,
        phoneNumber: paymentInfo.phoneNumber,
        amount: paymentInfo.amount,
        currency: paymentInfo.currency,
        frequency: paymentInfo.frequency,
        paymentMethod: paymentInfo.paymentMethod,
        message: paymentInfo.message || '',
        transactionId: transactionId,
        createdAt: Timestamp.now(), // Use Firestore server timestamp
      };

      const docRef = await addDoc(collection(db, 'donations'), donationData);
      console.log('Donation written with ID: ', docRef.id);
      return {
        success: true,
        message,
        transactionId,
        donationId: docRef.id,
      };
    } catch (dbError) {
      console.error('Error writing donation to Firestore: ', dbError);
      return {
        success: true, // Payment was "processed", but DB write failed
        message: `${message} However, there was an issue recording your donation. Please contact support with transaction ID ${transactionId}.`,
        transactionId,
      };
    }
  } catch (error) {
    console.error('Unexpected error in processDonationAction:', error);
    return {
      success: false,
      message: 'An unexpected server error occurred while processing your donation.',
    };
  }
}
