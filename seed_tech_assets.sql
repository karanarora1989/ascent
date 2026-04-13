-- SQL Script to Insert Tech Assets
-- Run this in your Supabase SQL Editor

-- Insert tech assets (will skip duplicates)
INSERT INTO public.tech_assets (name, category, is_active) 
SELECT * FROM (VALUES
  -- Core Systems
  ('Sales Central', 'Core Systems', true),
  ('Credit Central', 'Core Systems', true),
  ('Ops Central', 'Core Systems', true),
  ('Parakh', 'Core Systems', true),
  ('ARYA', 'Core Systems', true),
  ('OMJ', 'Core Systems', true),
  ('Mudra Stack', 'Core Systems', true),
  
  -- Customer Facing
  ('Customer App', 'Customer Facing', true),
  ('Website', 'Customer Facing', true),
  ('Vaani', 'Customer Facing', true),
  ('Customer 360', 'Customer Facing', true),
  
  -- CRM & Sales
  ('SFDC CRM', 'CRM & Sales', true),
  ('RCAL', 'CRM & Sales', true),
  
  -- Identity & Consent
  ('Consent Platform', 'Identity & Consent', true),
  ('Parichay', 'Identity & Consent', true),
  ('Posidex/JUM', 'Identity & Consent', true),
  
  -- Policy & Rules
  ('Policy Engine', 'Policy & Rules', true),
  ('Leo', 'Policy & Rules', true),
  
  -- Financial Systems
  ('Financials', 'Financial Systems', true),
  ('Employment', 'Financial Systems', true),
  ('Bureau/Models', 'Financial Systems', true),
  
  -- Payments & Transactions
  ('NACH', 'Payments & Transactions', true),
  ('Payments', 'Payments & Transactions', true),
  ('e-sign', 'Payments & Transactions', true),
  
  -- Communication
  ('Comm Central', 'Communication', true),
  ('Promotions', 'Communication', true),
  ('Mo-engage', 'Communication', true),
  
  -- Pricing & Partnerships
  ('Pricing', 'Pricing & Partnerships', true),
  ('Co-lending', 'Pricing & Partnerships', true),
  
  -- Loan Management
  ('Khata', 'Loan Management', true),
  ('Pennant', 'Loan Management', true),
  ('Microsure', 'Loan Management', true),
  ('Nivaran', 'Loan Management', true),
  ('Miles', 'Loan Management', true),
  
  -- Self-Service
  ('BYOT', 'Self-Service', true),
  ('BYOA', 'Self-Service', true),
  
  -- AI & Analytics
  ('AI workbench', 'AI & Analytics', true),
  ('SUD', 'AI & Analytics', true),
  ('Voice AI hiring', 'AI & Analytics', true),
  ('Analytics Central', 'AI & Analytics', true),
  
  -- HR & Operations
  ('Darwinbox', 'HR & Operations', true),
  ('Crismac', 'HR & Operations', true),
  ('Masters', 'HR & Operations', true)
) AS v(name, category, is_active)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tech_assets WHERE tech_assets.name = v.name
);

-- Verify the insert
SELECT category, COUNT(*) as count
FROM public.tech_assets
GROUP BY category
ORDER BY category;
