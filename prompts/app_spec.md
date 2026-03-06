# Self-Service Gym SaaS — Product Specification

## 1. Product Overview

**Product name (gymaccess.app):**  
GymAccess

**Purpose**

GymAccess is a lightweight SaaS platform that enables small community gyms and self-service training rooms to operate without manual administration.

The system automates:

- membership signup
- recurring payments
- access control (PIN codes)
- membership lifecycle management

The primary target is **small gyms run by volunteers**, typically with **20–200 members** and **minimal technical expertise**.

---

# 2. Core Problem

Small self-service gyms typically manage:

- manual payments (Vipps, bank transfer)
- spreadsheets tracking members
- manual reminder messages
- manual door code distribution

This leads to:

- significant administrative overhead
- errors in membership tracking
- unpaid members continuing to use facilities
- poor scalability

GymAccess automates these processes.

---

# 3. Design Principles

1. **Extreme simplicity**
2. **Minimal setup time (<15 minutes)**
3. **Mobile-first**
4. **No hardware lock-in**
5. **Low cost**

The system should work with:

- smart locks
- keyboxes
- shared door codes

---

# 4. Core Features (MVP)

## 4.1 Gym Setup

Admin registers:

- gym name
- location
- access device
- membership price
- billing frequency

Supported billing frequencies:

- monthly
- yearly

---

## 4.2 Member Signup

Members sign up via a **public signup page**.

Example:
https://gymaccess.app/join/{gym-id}


Signup flow:

1. Enter name
2. Enter phone/email
3. Accept terms
4. Pay membership
5. Receive access instructions

---

## 4.3 Payments

Payment model:

- recurring subscription

Supported providers (initial MVP):

- Stripe
- Vipps (optional future)
- Apple Pay / Google Pay via Stripe

Features:

- automatic recurring billing
- automatic payment retry
- subscription cancellation
- webhook events

Payment events drive access control.

---

## 4.4 Membership Lifecycle

Membership states:
Pending
Active
PastDue
Cancelled
Expired


State transitions:
Signup → Active
Payment failure → PastDue
Cancellation → Cancelled
Expired subscription → Expired

Access is granted only when: state == Active

---

# 5. Access Control

## 5.1 Supported Access Methods

### Method A — Shared PIN (simplest)

All active members receive the same code.

Example:
Gym PIN: 4821


Admin may rotate code periodically.

Advantages:

- no device integration required
- works with any lock or keybox

---

### Method B — Individual PIN

Each member receives a personal access code.

Example:

| Member | PIN |
|------|------|
| John | 4831 |
| Anna | 1192 |

Benefits:

- prevents sharing
- allows usage tracking

---

### Method C — Smart Lock Integration

Supported integrations:

- Igloohome
- Seam
- TTLock (future)

Capabilities:

- generate PIN codes
- schedule validity
- revoke access automatically

---

## 5.2 Access Automation

When membership becomes active:
generate access code
store code
send notification

When membership ends:
revoke code


---

# 6. Notifications

Notifications are sent via:

- email
- SMS (optional)

Events:

| Event | Notification |
|------|-------------|
| membership created | welcome message |
| payment successful | receipt |
| payment failed | reminder |
| membership cancelled | access expiration |
| code generated | access instructions |

Example message:
Welcome to Nordfjord Gym!

Your access code is:
4831

Membership valid while subscription is active.


---

# 7. Admin Dashboard

Admin interface must be extremely simple.

Main sections:

### Members

List with:

- name
- status
- last payment
- access code

Actions:

- suspend member
- cancel membership
- resend access info

---

### Access

Shows:

- current gym PIN
- individual codes
- ability to rotate shared PIN

---

### Payments

Overview:

- monthly revenue
- active subscriptions
- failed payments

---

### Settings

Configurable:

- membership price
- billing interval
- access type
- notification templates

---

# 8. Data Model

Core entities:

## Gym
gym_id
name
location
admin_user
membership_price
billing_interval
access_type

---

## Member
member_id
gym_id
name
email
phone
status
created_at

---

## Subscription
subscription_id
member_id
provider
provider_subscription_id
status
start_date
end_date

---

## AccessCode
code_id
member_id
code
valid_from
valid_to
device_id

---

# 9. API (Minimal)

### Create Member
POST /members

### Activate Membership
Triggered by payment webhook.
POST /subscriptions/activate

### Generate Access Code
POST /access/generate

### Revoke Access
POST /access/revoke

---

# 10. Automation Flow

Typical flow:
Member signup
↓
Stripe subscription created
↓
Webhook received
↓
Member activated
↓
Access code generated
↓
Email/SMS sent

---

# 11. Architecture (Simple)
Frontend
│
▼
API Server
│
├── Database
├── Payment provider
└── Lock integration

Recommended stack:

Backend

- Node.js / Typescript
- PostgreSQL

Frontend

- React / Next.js

Infrastructure

- Serverless (AWS / Azure)
or
- single container deployment


# 11A. MVP Hosting and Deployment Requirements

## Deployment Model

The MVP must be deployable and operated on **a single virtual machine (VM)** using **Docker Compose**.

The purpose of this requirement is to minimize operational complexity and infrastructure cost during early product stages.

The system must not require:

- Kubernetes
- distributed infrastructure
- managed cloud services
- multi-node deployments

A single-node deployment must be sufficient for production use during the MVP phase.

---

## Target Hosting Environment

The system must be compatible with standard Linux virtual machines.

Example providers:

- Hetzner Cloud
- DigitalOcean
- AWS EC2
- Azure Virtual Machines
- similar VPS providers

Minimum recommended VM specification:
2 vCPU
4 GB RAM
40–80 GB SSD
Linux (Ubuntu LTS recommended)

This configuration should support **hundreds of gyms and thousands of members**.

---

## Containerized Architecture

All services must run as **Docker containers managed via Docker Compose**.

Example deployment structure:

VM
│
└── docker-compose
│
├── reverse-proxy
├── frontend
├── api
├── worker
├── postgres
└── redis (optional)

---

## Required Services

### Reverse Proxy

Responsible for:

- TLS termination
- routing requests
- exposing HTTP/HTTPS

Recommended options:

- Traefik
- Nginx

---

### Frontend

Responsibilities:

- signup page
- admin dashboard
- member onboarding

Must be served as a static application or lightweight web app.

---

### API Service

Primary backend service responsible for:

- authentication
- member management
- subscription handling
- webhook processing
- access code generation
- integration with payment providers
- integration with lock APIs

---

### Worker Service

Handles asynchronous tasks:

- sending notifications
- retrying failed operations
- generating access codes
- background maintenance tasks

---

### Database

Primary database:


PostgreSQL


Stores:

- gyms
- members
- subscriptions
- access codes
- audit data

Data must persist on disk using Docker volumes.

---

### Redis (Optional)

Used for:

- caching
- background job queues
- rate limiting

Redis is optional for MVP but recommended.

---

## Deployment Process

The system must support simple deployment using:


docker compose up -d


Typical update workflow:


git pull
docker compose pull
docker compose up -d


No complex deployment pipelines should be required for MVP.

---

## Backup Requirements

The system must support automated backups of the PostgreSQL database.

Minimum requirement:

- daily database backup
- retention of at least 7 days

Backups may be stored:

- locally on disk
- or uploaded to object storage

---

## Monitoring and Logging

Basic logging must be available through Docker logs.

Example:


docker compose logs api
docker compose logs worker


Optional additions:

- uptime monitoring
- simple metrics
- error tracking

These are not required for MVP but may be added later.

---

## Scaling Strategy (Post-MVP)

The architecture must allow future scaling by:

- separating database into its own server
- adding additional API containers
- adding a load balancer
- introducing managed infrastructure

However, **no horizontal scaling is required for the MVP**.

The MVP architecture must prioritize **simplicity and reliability over scalability**.

---

---

# 11B. Local Development Environment

## Objective

The project must provide a **fully reproducible local development environment** that closely mirrors the production deployment.

Developers must be able to run the entire system locally using Docker Compose without requiring external infrastructure.

The goal is to ensure:

- fast onboarding for new developers
- consistent environments
- minimal configuration
- compatibility with automated development tools and AI coding agents

---

## Development Environment Requirements

The project repository must include a **Docker Compose configuration for development**.

Developers must be able to start the system locally using:


docker compose up


This must start all required services:


reverse-proxy
frontend
api
worker
postgres
redis (optional)


All services must be accessible locally.

Example local endpoints:


Frontend: http://localhost:3000

API: http://localhost:8080

Admin UI: http://localhost:3000/admin


---

## Repository Structure

The repository should follow a simple and predictable structure.

Example:


/project-root
│
├── docker-compose.yml
├── docker-compose.dev.yml
│
├── api/
│ └── source code
│
├── worker/
│ └── source code
│
├── frontend/
│ └── source code
│
├── infrastructure/
│ ├── nginx/
│ └── traefik/
│
└── scripts/
├── dev
├── backup
└── migrate


---

## Environment Configuration

Configuration must be controlled using environment variables.

A template configuration file must be provided:


.env.example


Developers create their local configuration by copying:


cp .env.example .env


Typical environment variables include:
DATABASE_URL
STRIPE_API_KEY
STRIPE_WEBHOOK_SECRET
SMTP_HOST
SMTP_USER
SMTP_PASSWORD
ACCESS_CODE_LENGTH
DEFAULT_MEMBERSHIP_PRICE


Sensitive values must **not** be committed to the repository.

---

## Local Database

PostgreSQL must run inside Docker and persist data using a volume.

Example:
postgres_data


Developers must be able to reset the database easily.

Example reset command:
docker compose down -v
docker compose up


---

## Database Migrations

Database schema changes must be managed using a migration system.

Requirements:

- migrations stored in the repository
- reproducible database schema
- automatic migration during startup or via script

Example workflow:
./scripts/migrate


---

## Seed Data

The development environment should support **optional seed data**.

Seed data may include:

- example gym
- test members
- sample subscriptions

Purpose:

- simplify development
- allow quick UI testing
- enable demo environments

Example command:


./scripts/seed


---

## Webhook Testing

Since payment systems use webhooks, the development environment must support **local webhook testing**.

Recommended tools:

- Stripe CLI
- local webhook forwarding

Example workflow:


stripe listen --forward-to localhost:8080/webhooks/stripe


---

## Development Workflow

Typical development cycle:


docker compose up
edit source code
service reloads automatically
test in browser


Hot reload should be enabled where possible for:

- frontend
- API services

---

## Logging

All services must log to standard output.

Logs must be viewable via:


docker compose logs -f


Individual service logs:


docker compose logs api
docker compose logs worker


---

## Testing (Optional for MVP)

Automated testing is not required for the MVP but the system should allow future support for:

- unit tests
- integration tests
- API tests

Example command:
npm test


---

## Development Goal

A developer must be able to:

1. clone the repository
2. copy `.env.example` to `.env`
3. run `docker compose up`

and have a **fully working development environment within minutes**.

# 12. Security Considerations

Required:

- HTTPS
- webhook verification
- encrypted access codes
- role-based admin access

Optional:

- audit logs
- rate limiting

---

# 13. Pricing Model (for SaaS)

Simple pricing:


Base fee: 99 NOK / month per gym
+
2–3% transaction fee


This keeps cost low for small gyms.

---

# 14. MVP Scope

MVP must include only:

- signup page
- recurring payments
- membership tracking
- access code generation
- admin dashboard
- email notifications

Everything else is optional.

---

# 15. Future Features

Potential future features:

- mobile app
- QR door access
- occupancy tracking
- equipment booking
- CCTV integration
- insurance compliance
- usage analytics

---

# 16. Target Market

Primary:

- village gyms
- community centers
- volunteer sports clubs
- small private gyms
- apartment gyms
- cabin / lodge gyms

Typical size:
20–200 members


---

# 17. Success Criteria

The system is successful if it reduces gym administration to:
< 10 minutes per month for the gym operator.
