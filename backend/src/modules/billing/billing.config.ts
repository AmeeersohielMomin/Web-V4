export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    generationsLimit: 3,
    stripePriceId: null
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    price: 19,
    generationsLimit: 50,
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID!
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 49,
    generationsLimit: -1,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!
  }
};

export type PlanId = keyof typeof PLANS;
