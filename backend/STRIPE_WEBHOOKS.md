# Stripe Webhooks - Testing Guide

## Overview
The Stripe webhook handler now supports full subscription lifecycle management including:
- Subscription renewals
- Payment failures
- Subscription cancellations
- Automatic premium status updates
- Email notifications for all events

## Webhook Events Handled

### 1. `checkout.session.completed`
**When**: Initial subscription payment is successful
**Action**: User's premium status is activated (handled by existing checkout flow)

### 2. `invoice.payment_succeeded`
**When**: Recurring subscription payment succeeds (monthly/yearly renewal)
**Actions**:
- Extends `premium_until` date by subscription period
- Sends "Subscription Renewed" email to user
- Updates transaction record

### 3. `invoice.payment_failed`
**When**: Recurring payment fails (expired card, insufficient funds, etc.)
**Actions**:
- Sets `payment_failed: true` on user record
- Creates 3-day grace period (`grace_period_until`)
- Sends "Payment Failed" email with update instructions
- Logs warning

### 4. `customer.subscription.deleted`
**When**: Subscription is cancelled or expires after failed payments
**Actions**:
- Sets `is_premium: false`
- Clears `premium_plan`
- Records `premium_expired_at` timestamp
- Sends "Subscription Ended" email

## Testing with Stripe CLI

### Setup
1. Install Stripe CLI: https://stripe.com/docs/stripe-cli
2. Login to your Stripe account:
   ```bash
   stripe login
   ```

### Forward webhooks to local development
```bash
stripe listen --forward-to localhost:8000/api/webhook/stripe
```

This will output a webhook signing secret. Add it to your `.env`:
```
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

### Trigger test events

#### Test subscription renewal
```bash
stripe trigger invoice.payment_succeeded
```

#### Test payment failure
```bash
stripe trigger invoice.payment_failed
```

#### Test subscription cancellation
```bash
stripe trigger customer.subscription.deleted
```

#### Test complete checkout flow
```bash
stripe trigger checkout.session.completed
```

## Manual Testing with Stripe Dashboard

1. **Enable test mode** in Stripe Dashboard
2. **Configure webhook endpoint**:
   - Go to Developers > Webhooks
   - Add endpoint: `https://your-domain.com/api/webhook/stripe`
   - Select events:
     - `checkout.session.completed`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `customer.subscription.deleted`

3. **Test with real subscription flow**:
   - Create a test subscription using test card: `4242 4242 4242 4242`
   - For failed payment: `4000 0000 0000 0341`
   - Cancel subscription from Stripe Dashboard
   - Verify webhook events fire and user status updates

## Monitoring

### Check webhook logs
```bash
# Backend logs
tail -f /app/backend/logs/webhook.log

# Or check database
db.payment_transactions.find().sort({updated_at: -1}).limit(10)
```

### Verify user premium status
```python
# In MongoDB
db.users.findOne({user_id: "user_id_here"}, {
  is_premium: 1,
  premium_plan: 1,
  premium_until: 1,
  payment_failed: 1,
  grace_period_until: 1
})
```

## Email Templates

Email notifications are sent for:
- **Subscription Renewed**: Confirms successful renewal
- **Payment Failed**: Alerts user with 3-day grace period notice
- **Subscription Ended**: Notifies when premium access ends

To customize email templates, edit the HTML in `stripe_service.py` functions:
- `handle_subscription_renewal()`
- `handle_payment_failed()`
- `handle_subscription_expired()`

## Production Deployment

### Required Environment Variables
```bash
STRIPE_API_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
RESEND_API_KEY=re_xxxxx
SENDER_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://yourdomain.com
```

### Security Best Practices
1. Always verify webhook signatures (handled automatically)
2. Use different webhook secrets for dev/staging/production
3. Log all webhook events for audit trail
4. Implement idempotency for webhook handlers
5. Monitor failed webhooks in Stripe Dashboard

## Troubleshooting

### Webhook not receiving events
- Check webhook endpoint is publicly accessible
- Verify webhook secret is correct
- Check Stripe Dashboard > Developers > Webhooks for failed deliveries
- Ensure endpoint returns 200 status

### User status not updating
- Check MongoDB for transaction records
- Verify user_id in transaction matches user record
- Check backend logs for errors
- Verify database connection

### Emails not sending
- Check RESEND_API_KEY is configured
- Verify sender email is verified in Resend
- Check backend logs for email service errors
- Test with `send_email()` function directly

## Additional Resources
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Stripe Test Cards](https://stripe.com/docs/testing)
