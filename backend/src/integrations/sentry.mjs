export async function initSentry(app){
  try { const S = await import("@sentry/node"); S.init({ dsn: process.env.SENTRY_DSN, tracesSampleRate: 0.1 }); app.use(S.Handlers.requestHandler()); app.use(S.Handlers.tracingHandler()); return S; }
  catch(e){ console.warn("[sentry] WARN:", e.message||e); return null; }
}
