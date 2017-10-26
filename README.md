## Call Center Node Example

[![Build Status](https://travis-ci.org/BandwidthExamples/node-call-center.svg?branch=master)](https://travis-ci.org/BandwidthExamples/node-call-center)

Simple app to work with pools of phone numbers.

## Prerequisites
- Configured Machine with Ngrok/Port Forwarding
  - [Ngrok](https://ngrok.com/)
- [Bandwidth Account](https://catapult.inetwork.com/pages/signup.jsf/?utm_medium=social&utm_source=github&utm_campaign=dtolb&utm_content=_)
- [Auth0 Account](https://auth0.com/) (it is used for user managment in this app)
- [NodeJS 8+](https://nodejs.org/en/)
- [Git](https://git-scm.com/)

### How to get Auth0 account data

* Go to [Auth0 Dashboard](https://manage.auth0.com/#/clients), login (if required) and press "New client"
* Enter app name and choose client type "Regular Web Applications". Press "Create".

![](/.images/create-client.png)

* Switch to tab "Settings" of created client and copy domain name, Client ID and Client Secret

![](/.images/client.png)

* Scroll to bottom of setting and set "Allowed Callback URLs" with https://YOUR-HOST/auth0/callback where YOUR-HOSTis name of host where this application is located.

![](/.images/callback.png)

* Press "Save".

## Build and Deploy

### One Click Deploy

#### Settings Required To Run
* ```Bandwidth User Id```
* ```Bandwidth Api Token```
* ```Bandwidth Api Secret```
* ```Auth0 Domain Name```
* ```Auth0 Client Id```
* ```Auth0 Client Secret```

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

## Run

### Directly

```bash
# open external access to this app (for example via ngrok)
ngrok http 3000

# in another terminal session
cd node-call-center

# configure the app
export BANDWIDTH_USER_ID=<YOUR-USER-ID>
export BANDWIDTH_API_TOKEN=<YOUR-API-TOKEN>
export BANDWIDTH_API_SECRET=<YOUR-API-SECRET>
export AUTH0_DOMAIN=<YOUR-AUTH0-DOMAIN>
export AUTH0_CLIENT_ID=<YOUR-AUTH0-CLIENT-ID>
export AUTH0_CLIENT_SECRET=<YOUR-AUTH0-CLIENT-SECRET>

# or (as alternative) fill these settings in .env file

npm install # to install dependencies

npm start # to start web app


# Open in browser url shown by ngrok

```

### Via Docker

```bash
# open external access to this app (for example via ngrok)
ngrok http 3000

# in another terminal session
cd node-call-center

# fill .env file with right values
cp ./.env-demo ./.env
vim ./.env

# then run the app (it will listen port 8080)
PORT=3000 docker-compose up -d

# Open in browser url shown by ngrok

```
