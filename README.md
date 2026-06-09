# 🚗 Pact - Next-Generation Carpooling

Cruzz is a premium, secure, and intuitive carpooling platform designed to connect commuters moving in the same direction. Built with a focus on enterprise-grade trust, dynamic route matching, and a flawless mobile-first user experience.

## 🌟 Unique Features
* **Corporate Verification:** SSO and corporate email verification for trusted enterprise pools.
* **Smart Deviation Routing:** PostGIS-powered matching that tolerates minor route deviations.
* **Preference Toggles:** Women-only pools and "Silent Ride" modes.
* **Eco-Dashboard:** Real-time tracking of CO2 reduction and gamified user tiers.

## 🛠 Tech Stack
* **Frontend:** React Native (Expo), Tailwind CSS (NativeWind)
* **Backend:** Node.js, Express
* **Database:** PostgreSQL + PostGIS (Geospatial routing)
* **Authentication:** JWT & Corporate SSO integration
* **Location Services:** Mapbox / Google Maps API

## 🚀 Getting Started
*(Setup instructions coming soon as microservices are initialized)*

## 📂 Architecture
This project uses a monorepo structure separating the mobile client and the Node.js API, sharing strict TypeScript definitions across environments.
