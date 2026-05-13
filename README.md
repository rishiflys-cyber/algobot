
# API KEY FIX

## Problem
Kite returned:

Invalid `api_key`

## Root Cause
Railway environment variable:
- missing
- typo
- old key
- wrong deployment variable

## Fix Applied
- centralized Kite config
- API_KEY validation
- hard failure if invalid
- prevents silent login redirects

## Railway Variables Required

API_KEY=your_kite_api_key
API_SECRET=your_kite_api_secret
ACCESS_TOKEN=your_access_token

## Replace everywhere

OLD:
const { KiteConnect } = require("kiteconnect");
const kc = new KiteConnect({ api_key: process.env.API_KEY });

NEW:
const kc = require("./config/kite");

