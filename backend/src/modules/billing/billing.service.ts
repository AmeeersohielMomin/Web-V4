import Stripe from 'stripe';
import { PlatformUser } from '../platform-auth/platform-user.model';
import { PLANS, PlanId } from './billing.config';

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('Stripe is not configured');
  }
  return new Stripe(key, { apiVersion: '2026-02-25.clover' });
}

export class BillingService {
  async createCheckoutSession(
    userId: string,
    planId: PlanId,
    successUrl: string,
    cancelUrl: string
  ) {
    const stripe = getStripeClient();
    const plan = PLANS[planId];
    if (!plan || !plan.stripePriceId) {
      throw new Error('Invalid plan');
    }

    const user = await PlatformUser.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      await PlatformUser.findByIdAndUpdate(userId, { stripeCustomerId: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: plan.stripePriceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId, planId }
    });

    if (!session.url) {
      throw new Error('Unable to create checkout session');
    }

    return session.url;
  }

  async createPortalSession(userId: string, returnUrl: string) {
    const stripe = getStripeClient();
    const user = await PlatformUser.findById(userId);
    if (!user?.stripeCustomerId) {
      throw new Error('No billing account found');
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl
    });

    return session.url;
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const stripe = getStripeClient();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Stripe webhook secret is not configured');
    }

    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const userId = metadata.userId;
        const planId = metadata.planId as PlanId;

        if (!userId || !planId || !PLANS[planId]) {
          throw new Error('Invalid checkout metadata');
        }

        const plan = PLANS[planId];
        await PlatformUser.findByIdAndUpdate(userId, {
          plan: planId,
          generationsLimit: plan.generationsLimit,
          generationsUsed: 0,
          stripeSubscriptionId:
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id || null
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await PlatformUser.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          {
            plan: 'free',
            generationsLimit: PLANS.free.generationsLimit,
            stripeSubscriptionId: null
          }
        );
        break;
      }

      default:
        break;
    }
  }
}

export const billingService = new BillingService();
