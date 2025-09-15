# Phone Verification Setup Guide

## Overview
This implementation uses Twilio for SMS verification, which is one of the most cost-effective and reliable solutions for phone verification.

## Cost Analysis
- **Twilio SMS**: ~$0.0075 per SMS (US numbers)
- **Free Trial**: $15-20 credit when you sign up
- **Monthly Cost**: For 1000 users = ~$7.50/month

## Setup Instructions

### 1. Create Twilio Account
1. Go to [twilio.com](https://twilio.com)
2. Sign up for a free account
3. Get your Account SID and Auth Token from the dashboard
4. Purchase a phone number (~$1/month)

### 2. Environment Variables
Add these to your `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

### 3. Development Mode
In development, if Twilio credentials aren't set, the system will:
- Log verification codes to the console
- Return the code in the API response for testing
- Not send actual SMS messages

### 4. Production Deployment
For production:
1. Set up proper Twilio credentials
2. Consider hashing verification codes in the database
3. Set up proper rate limiting
4. Monitor SMS costs

## Alternative Free/Low-Cost Options

### 1. Email Verification (Free)
- Verify via email instead of SMS
- Completely free
- Less secure but acceptable for many use cases

### 2. Firebase Phone Auth (Free Tier)
- 10,000 verifications/month free
- Google's service
- More complex setup

### 3. Vonage (Formerly Nexmo)
- ~$0.005 per SMS
- Slightly cheaper than Twilio

## Security Features Implemented

1. **Rate Limiting**: 1-minute cooldown between code requests
2. **Attempt Limits**: Maximum 5 failed attempts per code
3. **Code Expiration**: 10-minute validity
4. **Token Validation**: Temporary JWT required for verification
5. **Phone Number Validation**: E.164 format required

## Testing

1. Start your server
2. Log in with Google
3. You'll be redirected to `/verify-phone`
4. Enter a phone number
5. Check server console for the verification code (in development)
6. Enter the code to complete verification

## API Endpoints

- `POST /api/auth/request-phone-code` - Request verification code
- `POST /api/auth/verify-phone-code` - Verify the code

Both endpoints require the temporary JWT token from the Google OAuth flow. 