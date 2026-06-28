import { handleSubscribe } from '../lib/subscribe-handler.js';
import { insertSignup } from '../lib/signups.js';

// Thin adapter: translate the HTTP request/response to/from the pure handler.
// Vercel parses a JSON request body into `req.body` automatically.
export default async function handler(req, res) {
  const { status, body } = await handleSubscribe({
    method: req.method,
    body: req.body,
    save: ({ email }) => insertSignup(email),
  });
  res.status(status).json(body);
}
