
'use client';

import type { NextPage } from 'next';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, TrendingUp, CreditCard, Smartphone, Search as SearchIcon, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, Timestamp as FirestoreTimestamp } from 'firebase/firestore';

// Custom PayPal Icon
const PayPalIconLucide = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.435 6.11a1.71 1.71 0 0 1 1.709-1.694h3.018c1.836 0 2.98.606 3.474 2.037.475 1.374.04 3.06-.747 4.03-.817.996-2.058 1.409-3.555 1.409H11.27V18H8.536V6.11h1.899Z"/>
    <path d="M8.608 9.146a1.803 1.803 0 0 1 1.8-1.788h2.42c1.453 0 2.391.332 2.774 1.42.384 1.09.099 2.2-.523 2.922-.632.73-1.535 1.048-2.825 1.048H9.965V9.146Z"/>
  </svg>
);

type Currency = 'USD' | 'GBP' | 'KES';
const currencySymbols: Record<Currency, string> = {
  USD: '$',
  GBP: '£',
  KES: 'KSh',
};
const usdToRate: Readonly<Record<Currency, number>> = {
  USD: 1,
  GBP: 0.79,
  KES: 130.00,
};
const convertToUSD = (amount: number, currency: Currency): number => {
  if (currency === 'USD') return amount;
  const rate = usdToRate[currency];
  if (!rate || rate === 0) {
    console.error(`Invalid or unsupported currency rate for: ${currency}`);
    return 0;
  }
  return amount / rate;
};

interface Donation {
  id: string;
  firstName: string;
  lastName: string;
  amount: number;
  currency: Currency;
  createdAt: Date; // Changed from string to Date
  paymentMethod: 'card' | 'paypal' | 'mpesa'; // Lowercase
  message?: string;
  email?: string; // Optional, might be good to display
  transactionId?: string; // Optional
}

const DashboardPage: NextPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDonations = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const donationsCol = collection(db, 'donations');
        const q = query(donationsCol, orderBy('createdAt', 'desc'));
        const donationSnapshot = await getDocs(q);
        const donationsList = donationSnapshot.docs.map(doc => {
          const data = doc.data();
          let createdAtDate: Date;
          try {
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              createdAtDate = (data.createdAt as FirestoreTimestamp).toDate();
            } else if (data.createdAt instanceof Date) {
              createdAtDate = data.createdAt;
            } else if (data.createdAt) {
              createdAtDate = new Date(data.createdAt);
            } else {
              createdAtDate = new Date();
            }
          } catch (dateErr) {
            console.error(`Error parsing donation createdAt date for doc ${doc.id}:`, dateErr);
            createdAtDate = new Date();
          }

          return {
            id: doc.id,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            amount: typeof data.amount === 'number' ? data.amount : 0,
            currency: data.currency || 'USD',
            createdAt: createdAtDate,
            paymentMethod: data.paymentMethod || 'card',
            message: data.message,
            email: data.email,
            transactionId: data.transactionId,
          } as Donation;
        });
        setDonations(donationsList);
      } catch (err) {
        console.error("Error fetching donations:", err);
        setError("Failed to load donations. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDonations();
  }, []);

  const totalDonationsUSD = useMemo(() => donations.reduce((sum, donation) => {
    return sum + convertToUSD(donation.amount, donation.currency);
  }, 0), [donations]);

  const numberOfDonations = donations.length;

  const averageDonationUSD = useMemo(() => numberOfDonations > 0 ? totalDonationsUSD / numberOfDonations : 0, [totalDonationsUSD, numberOfDonations]);

  const filteredDonations = useMemo(() => {
    if (!searchTerm) {
      return donations;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return donations.filter(donation => {
      const fullName = `${donation.firstName} ${donation.lastName}`.toLowerCase();
      const message = donation.message?.toLowerCase() || '';
      const email = donation.email?.toLowerCase() || '';
      return fullName.includes(lowercasedFilter) || message.includes(lowercasedFilter) || email.includes(lowercasedFilter);
    });
  }, [searchTerm, donations]);

  const getPaymentMethodIcon = (method: Donation['paymentMethod']) => {
    switch (method) {
      case 'card':
        return <CreditCard className="h-5 w-5 text-muted-foreground" />;
      case 'paypal':
        return <PayPalIconLucide />;
      case 'mpesa':
        return <Smartphone className="h-5 w-5 text-muted-foreground" />;
      default:
        return null;
    }
  };
  
  const formatPaymentMethodName = (method: Donation['paymentMethod']) => {
    if (method === 'mpesa') return 'M-PESA';
    return method.charAt(0).toUpperCase() + method.slice(1);
  };


  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Donations Dashboard
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Overview of donation activity from Firestore.
        </p>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Donations (USD Equiv.)</CardTitle>
            <DollarSign className="h-5 w-5 text-accent" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">${totalDonationsUSD.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">
              Equivalent total amount received
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Number of Donations</CardTitle>
            <Users className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
             {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">{numberOfDonations}</div>}
            <p className="text-xs text-muted-foreground">
              Total individual donations made
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Donation (USD Equiv.)</CardTitle>
            <TrendingUp className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : <div className="text-2xl font-bold">${averageDonationUSD.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">
              Average amount per transaction
            </p>
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <CardTitle className="text-xl font-semibold text-primary">Recent Donations</CardTitle>
                    <CardDescription>
                    A list of the most recent contributions received.
                    </CardDescription>
                </div>
                <div className="relative w-full sm:w-auto sm:max-w-xs">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by name, email, message..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-4 text-muted-foreground">Loading donations...</p>
              </div>
            )}
            {error && !isLoading && (
              <Alert variant="destructive" className="my-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error} <Button variant="link" onClick={() => window.location.reload()}>Retry</Button></AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Donor Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDonations.map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell>{format(donation.createdAt, 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell>{donation.firstName} {donation.lastName}</TableCell>
                      <TableCell>{donation.email || '-'}</TableCell>
                      <TableCell className="text-right">
                        {currencySymbols[donation.currency]}{donation.amount.toFixed(2)} {donation.currency}
                      </TableCell>
                      <TableCell className="flex items-center gap-2">
                        {getPaymentMethodIcon(donation.paymentMethod)}
                        {formatPaymentMethodName(donation.paymentMethod)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground" title={donation.message}>
                        {donation.message || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredDonations.length === 0 && donations.length > 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                        No donations match your search.
                      </TableCell>
                    </TableRow>
                  )}
                  {donations.length === 0 && !isLoading && (
                     <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                         No donations recorded yet. Start by making a donation!
                        </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default DashboardPage;
