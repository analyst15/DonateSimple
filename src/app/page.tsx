
'use client';

import type { NextPage } from 'next';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { processDonationAction, type PaymentInfo, type PaymentResult } from '@/app/donate/actions';
import { Shirt, BookOpen, GraduationCap, CheckCircle, Loader2, CalendarClock, Repeat, CreditCard, Smartphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneNumberInput } from '@/components/phone-input';

// Custom PayPal Icon
const PayPalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.435 6.11a1.71 1.71 0 0 1 1.709-1.694h3.018c1.836 0 2.98.606 3.474 2.037.475 1.374.04 3.06-.747 4.03-.817.996-2.058 1.409-3.555 1.409H11.27V18H8.536V6.11h1.899Z"/>
    <path d="M8.608 9.146a1.803 1.803 0 0 1 1.8-1.788h2.42c1.453 0 2.391.332 2.774 1.42.384 1.09.099 2.2-.523 2.922-.632.73-1.535 1.048-2.825 1.048H9.965V9.146Z"/>
  </svg>
);


type Currency = 'USD' | 'GBP' | 'KES';
type PaymentMethod = 'card' | 'paypal' | 'mpesa';

const currencySymbols: Record<Currency, string> = {
  USD: '$',
  GBP: '£',
  KES: 'KSh',
};

// Exchange rates relative to USD (1 USD = X OtherCurrency)
const usdToRate: Readonly<Record<Currency, number>> = {
  USD: 1,
  GBP: 0.79, // 1 USD = 0.79 GBP (approx, as of mid-2024)
  KES: 130.00, // 1 USD = 130 KES (approx, as of mid-2024)
};

/**
 * Converts an amount from one currency to another.
 * @param amount The amount to convert.
 * @param fromCurrency The currency of the original amount.
 * @param toCurrency The target currency.
 * @returns The converted amount.
 */
const convertCurrency = (amount: number, fromCurrency: Currency, toCurrency: Currency): number => {
  if (fromCurrency === toCurrency) return amount;
  const fromRate = usdToRate[fromCurrency];
  const toRate = usdToRate[toCurrency];
  if (!fromRate || !toRate) {
    console.error('Currency conversion error: Unsupported or invalid currency specified.', { fromCurrency, toCurrency });
    return amount;
  }
  // Convert 'amount' from 'fromCurrency' to USD
  const amountInUSD = amount / fromRate;
  // Convert 'amountInUSD' to 'toCurrency'
  return amountInUSD * toRate;
};


interface DonationTier {
  id: string;
  amountUSD: number; // Base amount in USD
  name: string; // Short name for the tier, e.g. "Uniform"
  description: string; // Longer descriptive text
  icon: React.ElementType;
}

const donationTiers: DonationTier[] = [
  { id: 'uniform', amountUSD: 20000 / usdToRate.KES, name: 'Uniform', description: 'Help a Child Wear a Uniform, Wear a Smile', icon: Shirt },
  { id: 'books', amountUSD: 4000 / usdToRate.KES, name: 'Books', description: 'Put Books in Their Hands, Put Dreams in Their Hearts', icon: BookOpen },
  { id: 'school-fees', amountUSD: 100000 / usdToRate.KES, name: 'School Fees', description: 'Unlock a Child’s Future — Help Pay School Fees', icon: GraduationCap },
];

// To store paymentInfo for the success screen after form reset
let lastSuccessfulPaymentInfo: PaymentInfo | null = null;

const Home: NextPage = () => {
  const [selectedTier, setSelectedTier] = useState<DonationTier | null>(donationTiers[1]); // Default to "Books" tier
  const [customAmount, setCustomAmount] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [frequency, setFrequency] = useState<'one-time' | 'annually'>('one-time');
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>('KES'); // Default to KES
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card');

  const [cardNumber, setCardNumber] = useState<string>('');
  const [cardExpiry, setCardExpiry] = useState<string>(''); // MM/YY
  const [cardCvv, setCardCvv] = useState<string>('');
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [formVisible, setFormVisible] = useState<boolean>(true);
  const { toast } = useToast();
  
  const [isClient, setIsClient] = useState(false);
  const customAmountInputRef = useRef<HTMLInputElement>(null);
  const prevCurrencyRef = useRef<Currency>(selectedCurrency);


  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!selectedTier && customAmountInputRef.current) {
      customAmountInputRef.current.focus();
    }
  }, [selectedTier]);

  const getDisplayAmount = useCallback((amountUSD: number, targetCurrency: Currency): string => {
    return convertCurrency(amountUSD, 'USD', targetCurrency).toFixed(2);
  }, []);
  
  useEffect(() => {
    const previousCurrency = prevCurrencyRef.current;
    if (previousCurrency !== selectedCurrency) {
      if (customAmount && !selectedTier) { // Only convert if custom amount is active and no tier is selected
        const numericCustomAmount = parseFloat(customAmount);
        if (!isNaN(numericCustomAmount) && numericCustomAmount > 0) {
          const converted = convertCurrency(numericCustomAmount, previousCurrency, selectedCurrency);
          setCustomAmount(converted.toFixed(2));
        }
      }
    }
    prevCurrencyRef.current = selectedCurrency;
  }, [selectedCurrency, customAmount, selectedTier, getDisplayAmount]);


  const handleTierSelect = (tierId: string) => {
    const tier = donationTiers.find(t => t.id === tierId);
    if (tier) {
      setSelectedTier(tier);
      setCustomAmount(''); 
    }
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty string or numbers with up to 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setCustomAmount(value);
      setSelectedTier(null); 
    }
  };

  const handleCardExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const previousValue = cardExpiry;
    let value = e.target.value;

    value = value.replace(/[^0-9/]/g, ''); // Remove non-digit and non-slash characters
    const parts = value.split('/');
    if (parts.length > 2) { // Only one slash allowed
        value = parts[0] + '/' + parts.slice(1).join('');
    }
    if (parts[0] && parts[0].length > 2) { // Month part max 2 digits
        parts[0] = parts[0].slice(0, 2);
        value = parts.join('/');
    }
    if (parts[1] && parts[1].length > 2) { // Year part max 2 digits
        parts[1] = parts[1].slice(0, 2);
        value = parts.join('/');
    }

    if (value.length === 2 && previousValue.length === 1 && !value.includes('/') && !(e.nativeEvent instanceof InputEvent && e.nativeEvent.inputType === 'deleteContentBackward')) {
      value += '/';
    }
    if (value === '/') {
        value = '';
    }

    setCardExpiry(value.slice(0, 5)); // Max length MM/YY (5 chars)
  };

  const getDonationAmountInSelectedCurrency = useCallback((): number => {
    if (selectedTier) {
      return convertCurrency(selectedTier.amountUSD, 'USD', selectedCurrency);
    }
    return parseFloat(customAmount) || 0; // customAmount is already in selectedCurrency
  }, [selectedTier, customAmount, selectedCurrency]);

  const currentCurrencySymbol = currencySymbols[selectedCurrency];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setPaymentResult(null);

    const amountInSelectedCurrency = getDonationAmountInSelectedCurrency();
    if (amountInSelectedCurrency <= 0) {
      console.error('Validation error: Donation amount must be greater than zero.', {
        amount: amountInSelectedCurrency,
        currency: selectedCurrency,
      });
      toast({
        variant: 'destructive',
        title: 'Invalid Amount',
        description: `Please enter a valid donation amount in ${selectedCurrency}.`,
      });
      setIsLoading(false);
      return;
    }

    if (!firstName || !lastName || !email || !phoneNumber) {
      console.error('Validation error: Missing required fields.', {
        hasFirstName: !!firstName,
        hasLastName: !!lastName,
        hasEmail: !!email,
        hasPhoneNumber: !!phoneNumber,
      });
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all required fields (First Name, Last Name, Email, Phone Number).',
      });
      setIsLoading(false);
      return;
    }
    
    const minPhoneNumberLengthAfterCode = 7; 
    const phoneDigits = phoneNumber.replace(/\D/g, ''); 
    const hasPlus = phoneNumber.startsWith('+');

    if (!hasPlus || phoneDigits.length < minPhoneNumberLengthAfterCode + 1) { 
      console.error('Validation error: Invalid phone number format provided.', phoneNumber);
      toast({
        variant: 'destructive',
        title: 'Invalid Phone Number',
        description: 'Please enter a valid phone number including the country code (e.g., +1 1234567890).',
      });
      setIsLoading(false);
      return;
    }

    const paymentInfo: PaymentInfo = {
      amount: parseFloat(amountInSelectedCurrency.toFixed(2)), 
      currency: selectedCurrency,
      firstName,
      lastName,
      email,
      phoneNumber,
      frequency,
      paymentMethod: selectedPaymentMethod,
      message: message || undefined,
    };

    if (selectedPaymentMethod === 'card') {
      if (!cardNumber || !/^\d{13,19}$/.test(cardNumber)) { 
        console.error('Validation error: Invalid card number length or characters.');
        toast({ variant: 'destructive', title: 'Invalid Card Number', description: 'Please enter a valid card number (13-19 digits).' });
        setIsLoading(false); return;
      }
      if (!cardExpiry || !/^(0[1-9]|1[0-2])\/?([0-9]{2})$/.test(cardExpiry)) { 
        console.error('Validation error: Invalid card expiry date format (expected MM/YY).', cardExpiry);
        toast({ variant: 'destructive', title: 'Invalid Expiry Date', description: 'Please use MM/YY format (e.g., 03/25).' });
        setIsLoading(false); return;
      }
      const [monthStr, yearStr] = cardExpiry.split('/');
      const month = parseInt(monthStr, 10);
      const year = parseInt(`20${yearStr}`, 10); // Assuming 21st century
      const currentFullYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1; 
      if (year < currentFullYear || (year === currentFullYear && month < currentMonth)) {
        console.error('Validation error: Card has expired.', { cardExpiry, currentFullYear, currentMonth });
        toast({ variant: 'destructive', title: 'Card Expired', description: 'This card has expired. Please use a valid card.' });
        setIsLoading(false); return;
      }

      if (!cardCvv || !/^\d{3,4}$/.test(cardCvv)) {
        console.error('Validation error: Invalid CVV.');
        toast({ variant: 'destructive', title: 'Invalid CVV', description: 'Please enter a valid CVV (3 or 4 digits).' });
        setIsLoading(false); return;
      }
      paymentInfo.cardDetails = { cardNumber, cardExpiry, cardCvv };
    }


    try {
      const result = await processDonationAction(paymentInfo); // Call Server Action
      setPaymentResult(result); 

      if (result.success) {
        if (!result.donationId && paymentInfo.paymentMethod !== 'paypal') {
          console.error('Warning: Donation payment succeeded but saving record to Firestore failed:', result.message);
        }

        if (paymentInfo.paymentMethod === 'paypal') {
          toast({
            title: 'Proceeding to PayPal',
            description: result.message, 
            className: 'alert-success', 
          });
          // For PayPal mock, keep form visible, reset fields if desired, or just show toast.
          // In a real scenario, you might redirect here: window.location.href = result.redirectUrl;
          setIsLoading(false); 
          return; 
        }

        // For Card and M-PESA success
        lastSuccessfulPaymentInfo = { ...paymentInfo }; 
        toast({
          title: 'Donation Successful!',
          description: 'Thank you for your generous support.',
          className: 'alert-success',
        });
        setFormVisible(false); 
        // Reset form fields
        setSelectedTier(donationTiers[1]);
        setCustomAmount('');
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhoneNumber('');
        setMessage('');
        setFrequency('one-time');
        // setSelectedPaymentMethod('card'); // Keep or reset as desired
        setCardNumber('');
        setCardExpiry('');
        setCardCvv('');
      } else {
        console.error('Payment processing failed:', result.message);
        toast({
          variant: 'destructive',
          title: 'Payment Failed',
          description: result.message || 'An unexpected error occurred.',
        });
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        variant: 'destructive',
        title: 'Payment Error',
        description: 'There was an issue processing your payment. Please try again.',
      });
      setPaymentResult({ success: false, message: 'An unexpected error occurred during payment processing.' });
    } finally {
      // Ensure isLoading is set to false unless it's a successful PayPal that returned early
      // This logic seems to have a bug, if paymentResult is not yet set from the action call, it might behave unexpectedly
      // Let's re-evaluate: isLoading should be false unless it was a paypal success that returned early.
      // The 'paymentResult' in the condition `paymentInfo.paymentMethod === 'paypal' && paymentResult?.success`
      // refers to the state variable `paymentResult` which is set by `setPaymentResult(result)`
      // So, if the action call `result` was a paypal success, then `paymentResult` will be updated, and this condition can be true.
      if (!(paymentInfo.paymentMethod === 'paypal' && paymentResult?.success)) {
         // If it's NOT a PayPal success that already set isLoading to false and returned.
         // The paymentResult here is the state variable, which would have been set by the await processDonationAction.
         // If the paypal path was taken, it would return early after setIsLoading(false)
         // This condition should be:
         // if it was NOT (a paypal payment AND the result of THAT paypal payment was success)
         // THEN setIsLoading(false)
         // This seems correct, the original logic for PayPal success returns early *after* setIsLoading(false).
         // So this finally block's condition is to ensure other paths also set it to false.
        setIsLoading(false);
      }
    }
  };

  if (!isClient) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-muted-foreground">Loading DonateSimple...</p>
      </div>
    );
  }

  // Success screen, only for Card and M-PESA
  if (!formVisible && paymentResult?.success && lastSuccessfulPaymentInfo && lastSuccessfulPaymentInfo.paymentMethod !== 'paypal') {
    const successfulAmount = lastSuccessfulPaymentInfo.amount.toFixed(2);
    const successfulCurrencySymbol = currencySymbols[lastSuccessfulPaymentInfo.currency];

    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <Card className="w-full max-w-lg shadow-xl">
          <CardHeader>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent mb-4">
              <CheckCircle className="h-10 w-10 text-accent-foreground" />
            </div>
            <CardTitle className="text-3xl font-bold text-accent">Thank You for Your Donation!</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
              Your generosity is making a real difference.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">
              We've successfully received your donation of <strong className="text-primary">{successfulCurrencySymbol}{successfulAmount}</strong> via {lastSuccessfulPaymentInfo.paymentMethod}.
            </p>
            <p className="text-muted-foreground">A confirmation email has been sent to <strong>{lastSuccessfulPaymentInfo.email}</strong> (mock).</p>
            <p className="text-sm text-muted-foreground">{paymentResult.message}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => {setFormVisible(true); setPaymentResult(null); lastSuccessfulPaymentInfo = null;}} className="w-full">
              Make Another Donation
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="text-center py-12 bg-secondary rounded-lg shadow-md">
        <h1 className="text-4xl font-bold tracking-tight text-primary sm:text-5xl md:text-6xl">
          Support Our Cause
        </h1>
        <p className="mt-6 text-lg leading-8 text-foreground max-w-2xl mx-auto">
          Your contribution empowers us to continue our mission and create a positive impact.
          Join us in making a difference, one donation at a time.
        </p>
        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button size="lg" onClick={() => document.getElementById('donation-form')?.scrollIntoView({ behavior: 'smooth' })}>
            Donate Now
          </Button>
        </div>
      </section>

      <section>
        <h2 className="text-3xl font-semibold text-center mb-8 text-primary">Choose Your Impact</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {donationTiers.map((tier) => {
            const Icon = tier.icon;
            const displayAmount = getDisplayAmount(tier.amountUSD, selectedCurrency);
            return (
              <Card
                key={tier.id}
                className={`cursor-pointer transition-all duration-200 ease-in-out hover:shadow-xl ${
                  selectedTier?.id === tier.id ? 'ring-2 ring-primary shadow-lg' : 'shadow-md'
                }`}
                onClick={() => handleTierSelect(tier.id)}
              >
                <CardHeader className="items-center text-center">
                  <div className={`mb-3 p-3 rounded-full ${selectedTier?.id === tier.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl">{tier.name}</CardTitle>
                  <CardDescription className="text-base">{currentCurrencySymbol}{displayAmount}</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">{tier.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section id="donation-form">
        <Card className="w-full max-w-2xl mx-auto shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-primary">Make Your Donation</CardTitle>
            <CardDescription>
              Every contribution, big or small, helps us achieve our goals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Frequency and Currency Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="frequency" className="text-lg font-medium">Frequency</Label>
                  <RadioGroup
                    id="frequency"
                    value={frequency}
                    onValueChange={(value: 'one-time' | 'annually') => setFrequency(value)}
                    className="flex space-x-4 mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="one-time" id="one-time" />
                      <Label htmlFor="one-time" className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-muted-foreground" /> One Time</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="annually" id="annually" />
                      <Label htmlFor="annually" className="flex items-center gap-2"><Repeat className="h-5 w-5 text-muted-foreground" /> Annually</Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-lg font-medium">Currency</Label>
                  <Select value={selectedCurrency} onValueChange={(value: Currency) => setSelectedCurrency(value)}>
                    <SelectTrigger id="currency" className="mt-2">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">KES (KSh)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Donation Amount Selection */}
              <div>
                <Label htmlFor="amount" className="text-lg font-medium">Donation Amount</Label>
                <div className="mt-2">
                  <RadioGroup
                    value={selectedTier?.id || 'custom'}
                    onValueChange={(value) => {
                      if (value === 'custom') {
                        setSelectedTier(null);
                      } else {
                        handleTierSelect(value);
                      }
                    }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4"
                  >
                    {donationTiers.map((tier) => (
                      <Label
                        key={tier.id}
                        htmlFor={tier.id}
                        className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary h-20 cursor-pointer`}
                      >
                        <RadioGroupItem value={tier.id} id={tier.id} className="sr-only" />
                        {currentCurrencySymbol}{getDisplayAmount(tier.amountUSD, selectedCurrency)}
                        <span className="text-xs text-muted-foreground mt-1 text-center">{tier.name.split(' ')[0]}</span>
                      </Label>
                    ))}
                     <Label
                        htmlFor="custom"
                        className={`flex flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground [&:has([data-state=checked])]:border-primary h-20 cursor-pointer`}
                      >
                        <RadioGroupItem value="custom" id="custom" className="sr-only" />
                        Custom
                        <span className="text-xs text-muted-foreground mt-1 text-center">Amount</span>
                      </Label>
                  </RadioGroup>
                  
                  {!selectedTier && (
                    <Input
                      id="customAmountInput"
                      ref={customAmountInputRef}
                      type="text" 
                      inputMode="decimal" 
                      placeholder={`Enter custom amount (e.g., ${selectedCurrency === 'KES' ? '5000.00' : '75.50'} ${selectedCurrency})`}
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                      className="text-lg mt-2"
                    />
                  )}
                   <p className="mt-2 text-2xl font-bold text-primary">
                    Total Donation: {currentCurrencySymbol}{getDonationAmountInSelectedCurrency().toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" type="text" placeholder="John" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" type="text" placeholder="Doe" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="john.doe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <PhoneNumberInput
                  id="phoneNumber"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  required
                  placeholder="Enter phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Leave a Message (Optional)</Label>
                <Textarea id="message" placeholder="Your words of encouragement..." value={message} onChange={(e) => setMessage(e.target.value)} />
              </div>

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <Label className="text-lg font-medium">Payment Method</Label>
                <RadioGroup
                  value={selectedPaymentMethod}
                  onValueChange={(value: PaymentMethod) => setSelectedPaymentMethod(value)}
                  className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2"
                >
                  <Label
                    htmlFor="payment-card"
                    className={`flex items-center gap-3 rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${selectedPaymentMethod === 'card' ? 'border-primary' : 'border-muted'}`}
                  >
                    <RadioGroupItem value="card" id="payment-card" className="sr-only" />
                    <CreditCard className={`h-6 w-6 ${selectedPaymentMethod === 'card' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>Card</span>
                  </Label>
                  <Label
                    htmlFor="payment-paypal"
                    className={`flex items-center gap-3 rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${selectedPaymentMethod === 'paypal' ? 'border-primary' : 'border-muted'}`}
                  >
                    <RadioGroupItem value="paypal" id="payment-paypal" className="sr-only" />
                     <PayPalIcon />
                    <span>PayPal</span>
                  </Label>
                  <Label
                    htmlFor="payment-mpesa"
                    className={`flex items-center gap-3 rounded-md border-2 p-4 hover:bg-accent hover:text-accent-foreground cursor-pointer ${selectedPaymentMethod === 'mpesa' ? 'border-primary' : 'border-muted'}`}
                  >
                    <RadioGroupItem value="mpesa" id="payment-mpesa" className="sr-only" />
                    <Smartphone className={`h-6 w-6 ${selectedPaymentMethod === 'mpesa' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span>M-PESA</span>
                  </Label>
                </RadioGroup>
              </div>

              {/* Card Details - Conditionally Rendered */}
              {selectedPaymentMethod === 'card' && (
                <div className="space-y-4 border p-4 rounded-md shadow">
                  <h3 className="text-md font-medium text-primary">Enter Card Details</h3>
                  <div className="space-y-2">
                    <Label htmlFor="cardNumber">Card Number</Label>
                    <Input 
                      id="cardNumber" 
                      type="text" 
                      inputMode="numeric"
                      placeholder="0000 0000 0000 0000" 
                      value={cardNumber} 
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 19))} 
                      required={selectedPaymentMethod === 'card'} 
                      maxLength={19}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardExpiry">Expiry Date (MM/YY)</Label>
                      <Input 
                        id="cardExpiry" 
                        type="text" 
                        placeholder="MM/YY" 
                        value={cardExpiry} 
                        onChange={handleCardExpiryChange} 
                        required={selectedPaymentMethod === 'card'} 
                        maxLength={5}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardCvv">CVV</Label>
                      <Input 
                        id="cardCvv" 
                        type="text" 
                        inputMode="numeric"
                        placeholder="123" 
                        value={cardCvv} 
                        onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} 
                        required={selectedPaymentMethod === 'card'} 
                        maxLength={4}
                      />
                    </div>
                  </div>
                </div>
              )}
              
              {paymentResult && !paymentResult.success && (
                 <Alert variant="destructive">
                    <AlertTitle>Payment Error</AlertTitle>
                    <AlertDescription>{paymentResult.message}</AlertDescription>
                  </Alert>
              )}

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" size="lg" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Donate ${currentCurrencySymbol}${getDonationAmountInSelectedCurrency().toFixed(2)}`
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Home;

