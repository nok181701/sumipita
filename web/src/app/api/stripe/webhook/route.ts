import { getCloudflareContext } from "@opennextjs/cloudflare";
import Stripe from "stripe";
import { recordCheckoutCompleted, syncSubscriptionFromStripeObject } from "@/server/subscription";

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, { httpClient: Stripe.createFetchHttpClient() });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("missing signature", { status: 400 });

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET,
      undefined,
      cryptoProvider,
    );
  } catch (err) {
    console.error("stripe webhook signature verification failed", err);
    return new Response("invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.client_reference_id;
        if (userId) await recordCheckoutCompleted(userId, session);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionFromStripeObject(event.data.object);
        break;
      }
    }
  } catch (err) {
    console.error(`stripe webhook handling failed for ${event.type}`, err);
    // 5xxを返すとStripe側が自動的にリトライする
    return new Response("webhook handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
