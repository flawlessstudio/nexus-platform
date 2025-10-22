# Analytics Schema

This document defines the analytics events and properties tracked across the Nexus Platform. The goal is to maintain a consistent and understandable data schema for product analytics, user behavior analysis, and business intelligence.

We use a standard `event -> properties` model.

---

## Common Properties

These properties should be included with **every** event where applicable.

| Property    | Type   | Description                                  |
| :---------- | :----- | :------------------------------------------- |
| `userId`    | string | The unique identifier of the logged-in user. |
| `path`      | string | The URL path where the event occurred.       |
| `userAgent` | string | The user agent string of the client.         |

---

## Event Definitions

### 1. User Authentication

Events related to user sign-up, login, and account management.

**`user_signed_up`**
- Fired when a new user successfully completes the sign-up process.
- **Properties**:
  - `method`: (string) The method used for sign-up (e.g., 'email', 'google', 'passkey').

**`user_logged_in`**
- Fired when a user successfully logs in.
- **Properties**:
  - `method`: (string) The method used for login.

**`user_profile_updated`**
- Fired when a user updates their profile information.

### 2. Subscription & Billing (via Stripe)

Events related to monetization and subscription status.

**`subscription_started`**
- Fired when a user successfully subscribes to a paid plan.
- **Properties**:
  - `planId`: (string) The ID of the subscribed plan (e.g., 'pro', 'premium').
  - `price`: (number) The price of the plan.

**`subscription_canceled`**
- Fired when a user cancels their subscription.

### 3. Core Feature Usage

**`ai_assistant_queried`**
- Fired when a user submits a query to the AI assistant.
- **Properties**:
  - `queryLength`: (number) The character length of the user's query.
