-- PHYSIO MARKET relational schema foundation (PostgreSQL)
-- Do not store passwords, API keys, or private supplier negotiations in frontend files.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(180) NOT NULL,
  category VARCHAR(180),
  country_of_origin VARCHAR(100),
  website TEXT,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'needs_review',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(32) UNIQUE NOT NULL,
  name VARCHAR(220) NOT NULL,
  company_type VARCHAR(30) NOT NULL CHECK (company_type IN ('egyptian_company','manufacturer','supplier','distributor','service_provider')),
  country VARCHAR(100),
  city VARCHAR(120),
  address TEXT,
  phone VARCHAR(80),
  email VARCHAR(180),
  website TEXT,
  contact_person VARCHAR(180),
  verification_status VARCHAR(30) NOT NULL DEFAULT 'needs_review',
  verification_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  product_type VARCHAR(30) NOT NULL CHECK (product_type IN ('device','consumable','spare_part','accessory')),
  name VARCHAR(240) NOT NULL,
  brand_id UUID REFERENCES brands(id),
  model VARCHAR(160),
  description TEXT,
  intended_use TEXT,
  country_of_origin VARCHAR(100),
  medical_device_class VARCHAR(80),
  regulatory_status VARCHAR(40) NOT NULL DEFAULT 'unknown',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE company_products (
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  relationship_type VARCHAR(40) NOT NULL DEFAULT 'offers',
  authorization_status VARCHAR(30) NOT NULL DEFAULT 'unverified',
  authorization_scope TEXT,
  valid_from DATE,
  valid_to DATE,
  PRIMARY KEY(company_id, product_id, relationship_type)
);

CREATE TABLE price_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  product_id UUID NOT NULL REFERENCES products(id),
  company_id UUID REFERENCES companies(id),
  amount NUMERIC(14,2),
  currency CHAR(3) NOT NULL,
  price_type VARCHAR(30) NOT NULL CHECK (price_type IN ('published_retail','supplier_quote','platform_reference','historical')),
  moq INTEGER,
  observed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  source_url TEXT,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'needs_review',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES companies(id),
  quotation_number VARCHAR(120),
  issued_at DATE,
  expires_at DATE,
  currency CHAR(3) NOT NULL,
  incoterm VARCHAR(12),
  payment_terms TEXT,
  shipping_terms TEXT,
  status VARCHAR(30) NOT NULL DEFAULT 'draft',
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE quotation_items (
  quotation_id UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL,
  moq INTEGER,
  PRIMARY KEY(quotation_id, product_id)
);

CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  title VARCHAR(240) NOT NULL,
  source_type VARCHAR(40),
  url TEXT,
  publisher VARCHAR(180),
  published_at DATE,
  accessed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  reliability VARCHAR(30) NOT NULL DEFAULT 'unassessed',
  notes TEXT
);

CREATE TABLE source_links (
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  entity_type VARCHAR(40) NOT NULL,
  entity_id UUID NOT NULL,
  claim TEXT,
  verification_status VARCHAR(30) NOT NULL DEFAULT 'needs_review',
  PRIMARY KEY(source_id, entity_type, entity_id)
);

CREATE TABLE regulatory_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  title VARCHAR(240) NOT NULL,
  authority VARCHAR(180),
  jurisdiction VARCHAR(100),
  document_type VARCHAR(80),
  url TEXT,
  effective_date DATE,
  review_date DATE,
  status VARCHAR(30) NOT NULL DEFAULT 'reference',
  notes TEXT
);

CREATE TABLE logistics_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(40) UNIQUE NOT NULL,
  origin_country VARCHAR(100),
  origin_city VARCHAR(120),
  destination_country VARCHAR(100) DEFAULT 'Egypt',
  destination_city VARCHAR(120),
  transport_mode VARCHAR(30),
  incoterm VARCHAR(12),
  estimated_transit_days INTEGER,
  cost_amount NUMERIC(14,2),
  currency CHAR(3),
  customs_notes TEXT,
  source_id UUID REFERENCES sources(id),
  verification_status VARCHAR(30) NOT NULL DEFAULT 'needs_review'
);

CREATE INDEX idx_products_code ON products(code);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_companies_name ON companies(name);
CREATE INDEX idx_prices_product_date ON price_observations(product_id, observed_at DESC);
CREATE INDEX idx_sources_type ON sources(source_type);