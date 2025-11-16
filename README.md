# LakhDatar Fast Grow Pvt Ltd

Investment firm management system built with Next.js and Node.js.

## Features

- Member management with unique codes
- Deposit and withdrawal tracking
- Interest calculation (30-day cycles)
- Referral income calculation
- Master sheet for all transactions
- Automatic backups (last 5 backups)
- Local JSON file storage

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

The database file (`investment.json`) will be automatically created on first run.

## Default Login

- Username: `admin`
- Password: `admin123`

## Data Storage

- **Main database**: `investment.json` (project root)
- **Automatic backups**: `backups/` folder (keeps last 5 backups)
- All data stored locally on your laptop

