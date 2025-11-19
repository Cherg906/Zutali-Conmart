"use client";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Check } from "lucide-react";

interface TierSelectProps {
  tiers: { value: string; label: string; description?: string; features?: string[] }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export function TierSelect({ tiers, value, onChange, label }: TierSelectProps) {
  return (
    <div>
      <Label className="text-base font-semibold">{label}</Label>
      <div className="mt-3 space-y-3">
        {tiers.map((tier) => (
          <Card 
            key={tier.value} 
            className={`cursor-pointer transition-all ${
              value === tier.value 
                ? 'ring-2 ring-primary border-primary bg-primary/5' 
                : 'hover:border-primary/50'
            }`}
            onClick={() => onChange(tier.value)}
          >
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <RadioGroup value={value} onValueChange={onChange}>
                  <RadioGroupItem value={tier.value} id={tier.value} />
                </RadioGroup>
                <div className="flex-1">
                  <Label 
                    htmlFor={tier.value} 
                    className="text-base font-medium cursor-pointer"
                  >
                    {tier.label}
                  </Label>
                  {tier.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {tier.description}
                    </p>
                  )}
                  {tier.features && tier.features.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {tier.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-muted-foreground">
                          <Check className="h-3 w-3 mr-2 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
