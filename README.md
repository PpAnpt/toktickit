# TokTickIT - IT Service Desk

## Overview
TokTickIT is a full-stack IT service desk application. This repository contains the foundation built for Lab 1, integrating React, Express, Prisma, and PostgreSQL.

## Project Structure
- `client/`: React + TypeScript + Vite + Bootstrap frontend.
- `server/`: Node.js + Express + TypeScript + Prisma backend.
- `docs/`: Documentation and lab submissions.

## Setup Instructions
1. Install Node.js (v18+ recommended) and PostgreSQL.
2. Clone this repository.
3. Set up the backend:
   - Navigate to `server/`
   - Run `npm install`
   - Copy `.env.example` to `.env` and configure your `DATABASE_URL`.
   - Run `npx prisma migrate dev` to setup the database.
   - Run `npm run dev` to start the backend.
4. Set up the frontend:
   - Navigate to `client/`
   - Run `npm install`
   - Run `npm run dev` to start the frontend.