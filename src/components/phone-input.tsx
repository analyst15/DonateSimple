
'use client';

import type React from 'react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { countries, type Country } from '@/lib/countries';

interface PhoneNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  required?: boolean;
  placeholder?: string;
}

export const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  id,
  required,
  placeholder = "Enter phone number"
}) => {
  const defaultCountry = countries.find(c => c.isoCode === 'US') || countries[0];
  const [selectedCountry, setSelectedCountry] = useState<Country | undefined>(defaultCountry);
  const [localNumber, setLocalNumber] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    try {
      if (!value) {
        setLocalNumber('');
        // Optionally reset selectedCountry to default if value is cleared externally
        // setSelectedCountry(defaultCountry); 
        return;
      }

      let parsedCountry: Country | undefined = undefined;
      let parsedLocalNumber = value;

      const sortedCountries = [...countries].sort((a, b) => b.dialCode.length - a.dialCode.length);
      for (const country of sortedCountries) {
        if (value.startsWith(country.dialCode)) {
          parsedCountry = country;
          parsedLocalNumber = value.substring(country.dialCode.length).replace(/\D/g, ''); // Allow only digits
          break;
        }
      }

      if (parsedCountry) {
        setSelectedCountry(parsedCountry);
        setLocalNumber(parsedLocalNumber);
      } else {
        // No prefix found. Assume 'value' is a local number for the currently selected (or default) country.
        if (!selectedCountry) { // If no country was ever selected (e.g. initial load with local number)
          setSelectedCountry(defaultCountry);
        }
        setLocalNumber(value.replace(/\D/g, '')); // Allow only digits
      }
    } catch (error) {
      console.error('Error parsing phone number input:', error);
    }
  }, [value, defaultCountry]);

  useEffect(() => {
    if (selectedCountry) {
      const fullNumber = `${selectedCountry.dialCode}${localNumber}`;
      if (fullNumber !== value) {
         // Only call onChange if the number has actually changed or if it's an initial valid number from empty
        if (localNumber || (!value && selectedCountry.dialCode)) { // Ensure we don't send just dialCode if localNumber is empty unless value was also empty
             onChange(fullNumber);
        } else if (!localNumber && value !== selectedCountry.dialCode && value !== "") { // If localNumber cleared but original value was more than just dialcode
            onChange(selectedCountry.dialCode); // Send just the dial code if local part is empty
        } else if (!localNumber && !value) { // If both are empty strings, propagate empty
            onChange('');
        }
      }
    } else if (!localNumber && value !== "") { 
        onChange(''); // If no country and no local number, clear
    }
  }, [selectedCountry, localNumber, onChange, value]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery(''); 
  };

  const filteredCountries = searchQuery
    ? countries.filter(country =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.dialCode.includes(searchQuery) ||
        country.isoCode.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : countries;

  return (
    <div className="flex items-center w-full">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={isOpen}
            className="w-[140px] justify-between shrink-0 rounded-r-none border-r-0 text-sm"
            title={selectedCountry?.name}
          >
            <span className="truncate">
              {selectedCountry ? `${selectedCountry.isoCode} ${selectedCountry.dialCode}` : "Select"}
            </span>
            <ChevronsUpDown className="ml-1 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput
              placeholder="Search country..."
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="text-sm"
            />
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandList>
              <ScrollArea className="h-[200px]">
                <CommandGroup>
                  {filteredCountries.map((country) => (
                    <CommandItem
                      key={`${country.isoCode}-${country.dialCode}`} // Ensures unique key
                      value={`${country.name} ${country.dialCode} ${country.isoCode}`} // Value for Command's internal search
                      onSelect={() => handleCountrySelect(country)}
                      className="text-sm"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedCountry?.isoCode === country.isoCode && selectedCountry.dialCode === country.dialCode
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="truncate">{country.name} ({country.dialCode})</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <Input
        id={id}
        type="tel"
        autoComplete="tel-national"
        placeholder={placeholder}
        value={localNumber}
        onChange={(e) => setLocalNumber(e.target.value.replace(/\D/g, ''))} // Allow only digits
        required={required}
        className="rounded-l-none w-full text-sm"
      />
    </div>
  );
};
