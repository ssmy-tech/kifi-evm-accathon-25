# KiSignals
![Slide 16_9 - 22](https://github.com/user-attachments/assets/3d1042a5-9ec8-425f-bf8d-3f65dc959d51)

This repository contains the code for Team Kifi's submission to Monad's evm/accathon 2025.

Live Demo: https://accathon.kifi.app

Project Documentation (PLEASE READ): https://nova-screen-c53.notion.site/KiFi-Accathon-KiSignals-1b495657b8b18079b498dc6c490898f4

Telegram Setup Documentation: https://nova-screen-c53.notion.site/Telegram-Middleware-Setup-1b495657b8b1801cb3c7f21f3f446851


## What is KiSignals?

As a part of the Monad Accathon we Built KiSignals!  KiSignals is a Telegram integrated trading platform which allows you to trade directly off of social trading data all from one screen!  KiSignals allows users to securely provision platforms access to read-only telegram chat data with a self hosted middleware.  The platform then is able to pick up on new token calls from ‘Call Groups’ and provide users with AI analytics on their chats.  

In KiSignals we introduce a brand new feature called Centralized Automated Alpha where users set their buy amount and call threshold and we execute small alpha trades on their behalf!  This takes advantage of Monads Extremely Fast TPS and low fees, to allow users to enter quicker buy in smaller amounts and take advantage of the benifits of buying autonomously to early alpha!  CAA currently executes trades for the user when threshold is met and sells at a .75 stop loss or 2x limit order!  This feature paves the way for a new type of trading, where in the future users can set automated buys based off of the sentiment of selected social feeds, market statistics, and even narrative!


## Build/Run Instructions

### /backend-private

.env

```
# Database
DATABASE_URL="postgres://user:pw@url/db"
# Blockchain RPC URLs
ETHEREUM_RPC_URL=
BASE_RPC_URL=
MONAD_RPC_URL=
SOLANA_RPC_URL=

# Service specific settings
CHAT_SCRAPER_INTERVAL="*/1 * * * *"  # Every minute
API_HEALTH_INTERVAL="*/5 * * * *"    # Every 5 minutes
AI_ANALYTICS_INTERVAL="*/30 * * * *"  # Every 30 minutes 

AI_API_URL=url of deployed ai api
NILAI_API_URL=https://nilai-a779.nillion.network
NILAI_API_KEY=
#using 2 nillion urls to help with rate lmiting
NILAI_API_URL_2=https://nilai-a779.nillion.network
NILAI_API_KEY_2=
NILAI_API_MODEL_2=
RAPID_API_KEY=
ZEROX_API_KEY=
PRIVY_APP_ID=
PRIVY_APP_SECRET=
PRIVY_AUTHORIZATION_PRIVATE_KEY=
```

```
#ALL Services must be installed with

npm run install

#then

npx prisma generate

#then each service can be started with

npm run start:ai-analytics
npm run start:chat-scraper
npm run start:trade-executor
```

### /backend-public


.env

```
DATABASE_URL="postgres://user:pw@url/db"
PRIVY_APP_ID=
PRIVY_APP_SECRET=

# AWS Configuration
AWS_REGION=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET_NAME=
ANALYTICS_URL=
```

```
#ALL Services must be installed with

npm run install

#then

npx prisma generate

#then each service can be started with

npm run start
```


### /frontend

.env

```
NEXT_PUBLIC_PRIVY_ID=
NEXT_PUBLIC_GRAPHQL_URL=
NEXT_PUBLIC_ZEROX_KEY=
NEXT_PUBLIC_ALCHEMY_KEY=
```

```
#ALL Services must be installed with

npm run install

#then

npm run dev
```


### /telegram-middleware

documentation: https://nova-screen-c53.notion.site/Telegram-Middleware-Setup-1b495657b8b1801cb3c7f21f3f446851


.env

```
# Server Configuration
PORT=

TELEGRAM_API_ID=
TELEGRAM_API_HASH=

TELEGRAM_PHONE=

JWT_SECRET=
```

```
#ALL Services must be installed with

npm run install

#then

npm run build

#then

npm run start
```
