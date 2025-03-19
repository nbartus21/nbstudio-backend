/**
 * Stripe Webhook Test Script
 * 
 * This script helps test the Stripe webhook functionality by:
 * 1. Printing the current Stripe webhook configuration
 * 2. Creating a test payment event payload
 * 3. Sending the test payload to the webhook endpoint
 * 
 * Usage: 
 * - Make sure the server is running
 * - Run this script with: node scripts/test-stripe-webhook.js
 */

import Stripe from 'stripe';
import fetch from 'node-fetch';
import crypto from 'crypto';

// Konfigurációs adatok
const STRIPE_SECRET_KEY = 'sk_test_51QmjbrG2GB8RzYFBotDBVtSaWeDlhZ8fURnDB20HIIz9XzaqLaMFTStyNo4XWThSge1wRoZTVrKM5At5xnXVLIzf00jCtmKyXX';
const WEBHOOK_SECRET = 'whsec_test_webhook_secret_for_development'; // Ez a hardcoded secret egyezzen meg a payments.js-ben lévővel
const WEBHOOK_URL = 'http://localhost:5001/api/payments/webhook';

// Stripe inicializálása
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

// Teszt adatok a fizetési sessionhöz
const createTestPaymentSession = () => {
  return {
    id: `cs_test_${crypto.randomBytes(16).toString('hex')}`,
    object: 'checkout.session',
    after_expiration: null,
    allow_promotion_codes: null,
    amount_subtotal: 10000, // 100 EUR in cents
    amount_total: 10000, // 100 EUR in cents
    automatic_tax: { enabled: false, status: null },
    billing_address_collection: null,
    cancel_url: 'https://project.nb-studio.net/shared-project/test-token?canceled=true',
    client_reference_id: null,
    consent: null,
    consent_collection: null,
    created: Math.floor(Date.now() / 1000),
    currency: 'eur',
    custom_fields: [],
    custom_text: { shipping_address: null, submit: null },
    customer: null,
    customer_creation: 'if_required',
    customer_details: {
      address: {
        city: null,
        country: 'DE',
        line1: null,
        line2: null,
        postal_code: null,
        state: null
      },
      email: 'test-customer@example.com',
      name: 'Test Customer',
      phone: null,
      tax_exempt: 'none',
      tax_ids: []
    },
    customer_email: 'test-customer@example.com',
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    livemode: false,
    locale: null,
    metadata: {
      invoiceId: '612345678901234567890123', // FONTOS: használj egy létező invoiceId-t az adatbázisodból
      projectId: '512345678901234567890123', // FONTOS: használj egy létező projectId-t az adatbázisodból
      testValue: 'test123'
    },
    mode: 'payment',
    payment_intent: `pi_${crypto.randomBytes(16).toString('hex')}`,
    payment_link: null,
    payment_method_options: {},
    payment_method_types: ['card'],
    payment_status: 'paid',
    phone_number_collection: { enabled: false },
    recovered_from: null,
    setup_intent: null,
    shipping_address_collection: null,
    shipping_cost: null,
    shipping_details: null,
    shipping_options: [],
    status: 'complete',
    submit_type: null,
    subscription: null,
    success_url: 'https://project.nb-studio.net/shared-project/test-token?success=true&invoice=612345678901234567890123',
    total_details: { amount_discount: 0, amount_shipping: 0, amount_tax: 0 },
    url: null
  };
};

// Webhook aláírás létrehozása
const constructWebhookEvent = (payload, secret) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payloadString}`)
    .digest('hex');
  
  return {
    payload: payloadString,
    headers: {
      'stripe-signature': `t=${timestamp},v1=${signature}`,
      'content-type': 'application/json'
    }
  };
};

// Teszt webhook hívás
const testWebhook = async () => {
  try {
    // 1. Ellenőrizzük a Stripe webhook beállításokat
    console.log('Checking Stripe webhook configurations...');
    const webhooks = await stripe.webhookEndpoints.list({ limit: 10 });
    
    if (webhooks.data.length === 0) {
      console.log('No webhooks configured in Stripe. Consider setting up a webhook endpoint in your Stripe dashboard.');
    } else {
      console.log(`Found ${webhooks.data.length} webhook endpoints:`);
      webhooks.data.forEach((webhook, i) => {
        console.log(`  ${i+1}. URL: ${webhook.url}`);
        console.log(`     Events: ${webhook.enabled_events.join(', ')}`);
        console.log(`     Status: ${webhook.status}`);
      });
    }
    
    // 2. Létrehozunk egy teszt checkout.session.completed eseményt
    console.log('\nCreating test checkout.session.completed event...');
    const testSession = createTestPaymentSession();
    const testEvent = {
      id: `evt_${crypto.randomBytes(16).toString('hex')}`,
      object: 'event',
      api_version: '2023-10-16',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: testSession
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null
      },
      type: 'checkout.session.completed'
    };
    
    // 3. Aláírjuk az eseményt
    console.log('Signing the webhook event...');
    const { payload, headers } = constructWebhookEvent(testEvent, WEBHOOK_SECRET);
    
    // 4. Elküldjük a webhook kérést a szervernek
    console.log(`Sending test webhook to ${WEBHOOK_URL}...`);
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: headers,
      body: payload
    });
    
    // 5. Ellenőrizzük az eredményt
    console.log(`\nWebhook response status: ${response.status}`);
    const responseData = await response.json();
    console.log('Webhook response data:', responseData);
    
    if (response.ok) {
      console.log('\n✅ Test successful! The webhook was processed correctly.');
      console.log('Check your server logs for detailed information about how the webhook was processed.');
    } else {
      console.log('\n❌ Test failed. The webhook was not processed correctly.');
      console.log('Check your server logs for more information about what went wrong.');
    }
    
  } catch (error) {
    console.error('Error during webhook test:', error);
  }
};

// Futtatjuk a tesztet
testWebhook();