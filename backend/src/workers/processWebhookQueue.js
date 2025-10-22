import { supabaseAdmin } from "../utils/supabaseAdmin.js";
import * as SentryModule from "@sentry/node";

async function processOne(job) {
  const S = SentryModule;
  try {
    if (!supabaseAdmin) throw new Error('Supabase admin client not configured');
    const { id, event_id, event_type, payload } = job;

    // Start a Sentry transaction / breadcrumb
    if (S && S.addBreadcrumb) S.addBreadcrumb({ category: 'webhook', message: `Processing event ${event_id}`, data: { event_type } });

    // Idempotency: ensure event is recorded in stripe_events
    try {
      const { error: insertErr } = await supabaseAdmin.from('stripe_events').insert({ id: event_id, type: event_type, received_at: new Date().toISOString() });
      if (insertErr) {
        // If already exists, mark processed and skip
        if (insertErr.code === '23505') {
          await supabaseAdmin.from('webhook_queue').update({ processed: true, processed_at: new Date() }).eq('id', id);
          console.log('Event already processed, skipping', event_id);
          return;
        }
      }
    } catch (e) {
      console.warn('Could not insert stripe_events record', e?.message || e);
    }

    // Process known event types
    switch (event_type) {
      case 'checkout.session.completed': {
        const session = payload.data.object;
        const subscriptionId = session.subscription;
        const customerId = session.customer;
        const metadata = session.metadata || {};
        const userId = metadata.user_id || metadata.user || null;

        // Upsert subscription
        await supabaseAdmin.from('subscriptions').upsert({ id: subscriptionId, user_id: userId, status: 'active', customer_id: customerId, raw: session }, { onConflict: ['id'] });

        // Patch user row if present
        if (userId) {
          try {
            await supabaseAdmin.from('users').upsert({ id: userId, stripe_customer_id: customerId }, { onConflict: ['id'] });
          } catch (e) {
            console.warn('Failed to upsert user stripe_customer_id', e?.message || e);
          }
        }

        break;
      }
      case 'invoice.paid': {
        const inv = payload.data.object;
        const subscriptionId = inv.subscription;
        await supabaseAdmin.from('subscriptions').upsert({ id: subscriptionId, status: 'active', current_period_end: new Date(inv.current_period_end * 1000).toISOString() }, { onConflict: ['id'] });
        break;
      }
      case 'invoice.payment_failed': {
        const inv = payload.data.object;
        const subscriptionId = inv.subscription;
        await supabaseAdmin.from('subscriptions').upsert({ id: subscriptionId, status: 'past_due' }, { onConflict: ['id'] });
        break;
      }
      default:
        console.log('Unhandled event type in worker', event_type);
    }

    // Mark job processed
    await supabaseAdmin.from('webhook_queue').update({ processed: true, processed_at: new Date() }).eq('id', id);
  } catch (err) {
    console.error('Worker error processing job', err);
    if (S && S.captureException) S.captureException(err);
    // increment attempts and leave unprocessed for retry
    try { await supabaseAdmin.from('webhook_queue').update({ attempts: job.attempts + 1 }).eq('id', job.id); } catch (e) { /* ignore */ }
  }
}

export async function processQueue({ limit = 10 } = {}) {
  if (!supabaseAdmin) {
    console.warn('Supabase admin not configured, cannot process queue');
    return;
  }

  // Select unprocessed rows
  const { data, error } = await supabaseAdmin.from('webhook_queue').select('*').eq('processed', false).limit(limit).order('created_at', { ascending: true });
  if (error) {
    console.warn('Could not fetch queue items', error.message || error);
    return;
  }

  for (const job of data || []) {
    await processOne(job);
  }
}

// If run directly, process a batch
if (require.main === module) {
  processQueue().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
}
