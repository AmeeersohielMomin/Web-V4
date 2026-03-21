import { Router } from 'express';
import { requireAuth } from '../../middleware/auth.middleware';
import { PlanId, PLANS } from './billing.config';
import { billingService } from './billing.service';

const router = Router();

router.get('/plans', (_req, res) => {
  res.json({
    success: true,
    data: {
      plans: [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          currency: 'usd',
          interval: null,
          generationsLimit: 3,
          features: ['3 app generations', 'Download as ZIP', 'All templates']
        },
        {
          id: 'starter',
          name: 'Starter',
          price: 19,
          currency: 'usd',
          interval: 'month',
          generationsLimit: 50,
          features: ['50 generations/month', 'Download + Deploy', 'Priority generation']
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 49,
          currency: 'usd',
          interval: 'month',
          generationsLimit: -1,
          features: ['Unlimited generations', 'All deploy options', 'Custom domains', 'Priority support']
        }
      ]
    },
    error: null
  });
});

router.post('/checkout', requireAuth, async (req, res) => {
  try {
    const planId = req.body.planId as PlanId;
    if (!planId || !PLANS[planId] || planId === 'free') {
      throw new Error('Invalid plan selection');
    }

    const url = await billingService.createCheckoutSession(
      (req as any).userId,
      planId,
      `${process.env.FRONTEND_URL}/dashboard?upgraded=true`,
      `${process.env.FRONTEND_URL}/pricing`
    );
    res.json({ success: true, data: { url }, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

router.post('/portal', requireAuth, async (req, res) => {
  try {
    const url = await billingService.createPortalSession(
      (req as any).userId,
      `${process.env.FRONTEND_URL}/dashboard`
    );
    res.json({ success: true, data: { url }, error: null });
  } catch (err: any) {
    res.status(400).json({ success: false, data: null, error: err.message });
  }
});

router.post('/webhook', async (req, res) => {
  const signature = req.headers['stripe-signature'] as string;
  try {
    await billingService.handleWebhook(req.body as Buffer, signature);
    res.json({ received: true });
  } catch (err: any) {
    res.status(400).send(`Webhook error: ${err.message}`);
  }
});

export default router;
