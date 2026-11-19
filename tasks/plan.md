# Implementation Plan: SmiTriX v1.7.0 Production Upgrade

## Overview
Upgrade SmiTriX to a production-grade commercial fitness platform with mandatory authentication, paid subscription plans with payment gateway checkout (Razorpay / Stripe / Interactive Card & UPI Checkout), a biomechanical & recovery-driven Exercise Recommendation Engine, Hevy-style Workout Photo Posts & Social Feed in Profile, an upgraded Hevy-style Exercises Library, a Firestore Customer Insights & Feedback pipeline, and an animated multi-step onboarding tutorial.

## Architecture Decisions
- **Mandatory Authentication (`!DEMO`)**: Disable automatic guest-mode fallback on non-demo builds in `useStore.js`, `Login.jsx`, and `Profile.jsx` so every user signs in via Google OAuth, Email/Password, or Passkey and syncs with Cloud Firestore. Keep `src/lib/guest.js` pure helper intact for backward compatibility with unit tests.
- **Payment Gateway & Entitlements (`src/lib/payment-gateway.js` + `src/lib/subscription-plans.js`)**: Support 3 tiers (`free`, `pro`, `legacy`) with Razorpay SDK integration, Stripe payment link support, and a built-in interactive Card / UPI checkout sheet that records verified receipts in local state (`S.billingHistory`) and Cloud Firestore (`subscriptions` collection).
- **Biomechanical Exercise Recommendations (`src/lib/recommendations.js`)**: Rank exercises by muscle recovery readiness (under-trained muscles in the last 14 days), somatotype alignment, equipment profile compatibility, and PR progression potential.
- **Hevy-Style Workout Photo Posts (`src/components/WorkoutPhotoFeed.jsx`)**: Compress uploaded/captured workout photos via HTML5 Canvas (`<= 900px`, JPEG `0.78`) so photos store cleanly in local state (`S.workoutPosts`) and sync to Cloud Firestore (`workout_posts`).
- **Customer Data & Telemetry (`src/lib/analytics.js`)**: Sync structured customer product metrics (`customer_insights/{uid}`) and user feedback (`feedback` collection) to Firestore on login, workout completion, and tier upgrade.

## Task List

### Phase 1: Mandatory Auth & Customer Data Telemetry
- [x] Task 1: Enforce mandatory login/signup on non-demo builds and add customer insights sync (`syncCustomerInsights`)
- [x] Task 2: AddPaid Plans (`Pro Athlete` + `Legacy Vault`) and Payment Gateway checkout (`src/lib/payment-gateway.js`, `PlansManager.jsx`)

### Checkpoint: Auth & Billing Foundation
- [x] Tests pass, builds clean

### Phase 2: Hevy-Style Workout Photo Feed, Exercise Recommendations & Library Upgrade
- [x] Task 3: Build Smart Exercise Recommendations Engine (`src/lib/recommendations.js`) + unit tests
- [x] Task 4: Build Hevy-Style Workout Photo Post & Feed (`src/components/WorkoutPhotoFeed.jsx`) and integrate into `Profile.jsx`
- [x] Task 5: Upgrade `Library.jsx` with Hevy-style Recommended Carousel, session counts, PR tags, and 1-tap add to active workout

### Checkpoint: Core Features
- [x] End-to-end flow works

### Phase 3: Animated Tutorial & v1.7.0 Release
- [x] Task 6: Upgrade `TutorialDialog.jsx` with premium fitness animations and new Pro/Social step
- [x] Task 7: Run full Vitest + API test suite, deploy to Firebase Hosting (`smitrix.web.app`), and release `v1.7.0` (`versionCode 34`)
