require('dotenv').config();

if (!process.env.FCM_API_KEY || !process.env.VAPID_EMAIL || !process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  return console.error('❗ Failed to load in the environment variables. Are they missing from the `.env` file?');
}

const subscriptions = {};

function messageValidator() {
  const TITLE_MAX_LENGTH = 31;
  for (messageKey in messages) {
    const message = messages[messageKey];

    if (message.title.length > 31) {
      console.log(`[${messageKey}] Title is too big (${message.title.length}), more than ${TITLE_MAX_LENGTH}.`)
    }

  }
}

const messages = require('./messages');

const webPush = require('web-push');
const express = require('express');
const bodyParser = require('body-parser');

webPush.setGCMAPIKey(process.env.FCM_API_KEY);
webPush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const app = express();

const jsonParser = bodyParser.json();

// Static files
app.use(express.static('.'));

app.post('/subscription', jsonParser, (req, res) => {
  const { subscription } = req.body;

  // check if already subscribed
  const userSubscription = subscriptions[subscription.endpoint];

  if (!userSubscription) {
    // initialise the first messages
    subscription.currentMessage = 'intro';

    // add new subscription
    subscriptions[subscription.endpoint] = subscription;

    // send the first message
    sendMessage(subscription);
  }

  res.sendStatus(201);
});

app.delete('/subscription', jsonParser, (req, res) => {
  const { subscription } = req.body;

  if (!subscriptions[subscription.endpoint]) {
    return res.sendStatus(404);
  }

  // remove subscription from array
  delete subscriptions[subscription.endpoint];

  // A real world application would store the subscription info.
  // we'd stick this data into subscriptions
  res.sendStatus(201);
});

app.post('/action', jsonParser, (req, res) => {
  const { action, endpoint } = req.body;

  const subscription = subscriptions[endpoint];

  if (!subscription) {
    return res.sendStatus(404);
  }

  // change currentMessage
  subscriptions[endpoint].currentMessage = action;

  sendMessage(subscription);

  res.sendStatus(201);
});

function sendMessage(subscription) {
  const message = messages[subscription.currentMessage];

  if (!message) {
    return;
  }

  const actions = message.actions.map(action => {
    if (action.text === 'Continue') {
      return { action: action.id, title: `Continue: ${action.icon}` };
    }
    return { action: action.id, title: `Choose: ${action.icon}` };
  });

  const bodyActions = message.actions.map(action => {
    if (action.text === 'Continue') {
      return '';
    }
    return `\n\n${action.icon} ${action.text}`;
  });
  const body = `${message.body} ${bodyActions}`.trim();

  const data = {
    tag: subscription.endpoint,
    title: message.title,
    body,
    actions,
    icon: `images/${message.image}`,
    vibrate: [0],
    // badge: ''
  };

  webPush.sendNotification(subscription, JSON.stringify(data));
}

const port = process.env.PORT || 3000;
app.listen(port, (err) => {
  if (err) {
    return console.error(err);
  }

  console.info(`🌐 Listening at http://localhost:${port}/`);
});
