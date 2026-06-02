import type { MortgageEstimateResponse, MortgageProfile, PropertyEstimate } from '../types';

export const emptyEstimateData: MortgageEstimateResponse = {
  profile: null,
  date: null,
  estimates: []
};

export const mortgageIcons = {
  property: String.fromCodePoint(0x1F3E0),
  sources: String.fromCodePoint(0x1F4CD),
  terms: String.fromCodePoint(0x1F4CB),
  progress: String.fromCodePoint(0x23F3)
};

export type MortgageMetrics = {
  propertyEstimate: number;
  equity: number;
  ltv: number | null;
  equityPercent: number | null;
  paidMonths: number;
  termProgress: number | null;
  estimatedPayment: number | null;
  dailyInterest: number | null;
};

export type MortgagePayoffPoint = {
  label: string;
  balance: number;
  equity: number | null;
  interestPaid: number;
};

export type MortgagePayoff = {
  schedule: MortgagePayoffPoint[];
  monthlyPayment: number | null;
  monthlyEquity: number | null;
  monthlyInterest: number | null;
  totalInterest: number | null;
  projectedPayoffDate: string | null;
  interestShare: number | null;
};

export function primaryEstimate(estimates: PropertyEstimate[]) {
  return estimates[0] || null;
}

export function calculateMortgageMetrics(profile: MortgageProfile | null, estimate: PropertyEstimate | null): MortgageMetrics {
  const propertyEstimate = estimate?.value || 0;
  const principal = profile?.principal_balance || 0;
  const originalTerm = profile?.original_term_months || 0;
  const remainingTerm = profile?.remaining_term_months || 0;
  const annualRate = profile?.annual_interest_rate || 0;
  const equity = propertyEstimate - principal;
  const ltv = propertyEstimate > 0 ? principal / propertyEstimate * 100 : null;
  const equityPercent = propertyEstimate > 0 ? equity / propertyEstimate * 100 : null;
  const paidMonths = Math.max(0, originalTerm - remainingTerm);
  const termProgress = originalTerm > 0 ? paidMonths / originalTerm * 100 : null;
  const monthlyRate = annualRate / 12;
  const estimatedPayment = principal > 0 && remainingTerm > 0 && monthlyRate > 0
    ? principal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -remainingTerm))
    : null;
  const dailyInterest = principal > 0 && annualRate > 0 ? principal * annualRate / 365 : null;
  return { propertyEstimate, equity, ltv, equityPercent, paidMonths, termProgress, estimatedPayment, dailyInterest };
}

export function calculateMortgagePayoff(profile: MortgageProfile | null, propertyEstimate: number): MortgagePayoff {
  if (!profile || profile.principal_balance <= 0 || profile.remaining_term_months <= 0) {
    return {
      schedule: [],
      monthlyPayment: null,
      monthlyEquity: null,
      monthlyInterest: null,
      totalInterest: null,
      projectedPayoffDate: null,
      interestShare: null
    };
  }

  const monthlyRate = profile.annual_interest_rate / 12;
  const months = profile.remaining_term_months;
  const startingPrincipal = profile.principal_balance;
  const monthlyPayment = monthlyRate > 0
    ? startingPrincipal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -months))
    : startingPrincipal / months;
  const monthlyInterest = monthlyRate > 0 ? startingPrincipal * monthlyRate : 0;
  const monthlyEquity = Math.min(startingPrincipal, Math.max(0, monthlyPayment - monthlyInterest));
  let balance = startingPrincipal;
  let totalInterest = 0;
  const schedule: MortgagePayoffPoint[] = [{
    label: 'Now',
    balance,
    equity: propertyEstimate > 0 ? propertyEstimate - balance : null,
    interestPaid: 0
  }];

  for (let month = 1; month <= months && balance > 0; month += 1) {
    const interest = monthlyRate > 0 ? balance * monthlyRate : 0;
    const principal = Math.min(balance, Math.max(0, monthlyPayment - interest));
    totalInterest += interest;
    balance = Math.max(0, balance - principal);

    if (month % 12 === 0 || month === months || balance === 0) {
      schedule.push({
        label: `Y${Math.ceil(month / 12)}`,
        balance,
        equity: propertyEstimate > 0 ? propertyEstimate - balance : null,
        interestPaid: totalInterest
      });
    }
  }

  const payoffTotal = startingPrincipal + totalInterest;
  return {
    schedule,
    monthlyPayment,
    monthlyEquity,
    monthlyInterest,
    totalInterest,
    projectedPayoffDate: toIsoDate(addMonths(new Date(), months)),
    interestShare: payoffTotal > 0 ? totalInterest / payoffTotal * 100 : null
  };
}

export function buildLoanTermRows(profile: MortgageProfile | null, metrics: MortgageMetrics): [string, string][] {
  return [
    ['Origination Date', formatMortgageDate(profile?.origination_date)],
    ['Loan Maturity Date', formatMortgageDate(profile?.maturity_date)],
    ['Original Term', profile ? `${profile.original_term_months} months` : '-'],
    ['Remaining Term', profile ? `${profile.remaining_term_months} months` : '-'],
    ['Current Annual Interest Rate', profile ? `${(profile.annual_interest_rate * 100).toFixed(3)}%` : '-'],
    ['Months Paid', profile ? `${metrics.paidMonths} months` : '-']
  ];
}

export function formatMortgageDate(date: string | null | undefined) {
  if (!date) return 'Unknown';
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
