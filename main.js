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

const passages = require('./twison.json').passages;

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
    subscription.currentMessage = '1';

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
  const passage = passages.find(passage => passage.pid === subscription.currentMessage);

  if (!passage) {
    return;
  }

  let actions = '';
  let bodActions = '';

  if (passage.links && passage.links.length > 0) {
    actions = passage.links.map((link, i) => {
      if (link.pid === 1) {
        return { action: link.pid, title: 'Start again' };
      }
      if (link.name === link.link) {
        return { action: link.pid, title: 'Continue' };
      }
      return { action: link.pid, title: `Choose: ${i+1}` };
    });

    bodyActions = passage.links.map((link, i) => {
      if (link.pid === 1 || link.name === link.link) {
        return '';
      }
      return `${i+1}: ${link.name}`;
    });
  }

  const bodyText = passage.text.replace(/\[\[.+\]\]/g, '').trim(); // remove twine links
  const body = `${bodyText}\n\n${bodyActions.join('\n')}`.trim();

  let icon = '';
  if (passage.tags && passage.tags.length > 0) {
    icon = `images/${passage.tags[0]}.png`;
  }

  const data = {
    tag: subscription.endpoint,
    title: '',
    body,
    actions,
    icon,
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
