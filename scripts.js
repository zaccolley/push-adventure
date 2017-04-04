function reRender() {
  const {
    pushNotificationsBlocked,
    pushNotificationsSupported,
    pushNotificationsDisabled,
    pushNotificationsOn
  } = state;

  let pushNotificationsButtonText = '';

  if (pushNotificationsSupported) {
    if (pushNotificationsBlocked) {
      pushNotificationsButtonText = "You've blocked notifications";
    } else if (pushNotificationsOn) {
      pushNotificationsButtonText = 'Disable push notifications';
    } else {
      pushNotificationsButtonText = 'Enable push notifications';
    }
  }

  const button = document.querySelector('.button');

  button.disabled = pushNotificationsDisabled;
  button.innerHTML = pushNotificationsButtonText;
}

let state = {
  pushNotificationsBlocked: false,
  pushNotificationsSupported: false,
  pushNotificationsDisabled: true,
  pushNotificationsOn: false
};

function setState(newState) {
  state = Object.assign(state, newState);
  reRender();
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const vapidPublicKey = 'BAlbZ-NR-ILquFZCe9PrkXWTOvG4swPjP_NIcBp0B0fZ4vf_qKjp8rmjqQ4PDojjnIHP5FKFYhLrHRF3bGNF8ls';
const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

function initPushNotifications(registration) {
  if (!registration) {
    return;
  }

  // Check if push messaging is supported
  if (!('PushManager' in window)) {
    return console.error('Push messaging isn\'t supported.');
  }

  setState({ pushNotificationsSupported: true });

  // Check the current Notification permission.
  // If its denied, it's a permanent block until the
  // user changes the permission
  if (Notification.permission === 'denied') {
    setState({ pushNotificationsBlocked: true });
    return console.error('The user has blocked notifications.');
  }

  registration.pushManager.getSubscription().then(subscription => {
    setState({ pushNotificationsDisabled: false });

    // We aren’t subscribed to push, so set UI
    // to allow the user to enable push
    if (!subscription) {
      return;
    }

    handleSubscriptionOnServer(subscription);
    setState({ pushNotificationsOn: true });
  })
  .catch(error => {
    console.error('Error during getSubscription()', error);
  });
}

function handleSubscriptionOnServer(subscription, action) {
  // Send the subscription details to the server using the Fetch API.
  return fetch('./subscription', {
    method: action ? 'delete' : 'post',
    headers: {
      'Content-type': 'application/json'
    },
    body: JSON.stringify({ subscription })
  })
  .catch(error => console.error);
}

function subscribe(registration) {
  // Disable the button so it can't be changed while
  // we process the permission request
  setState({ pushNotificationsDisabled: false });

  // Otherwise, subscribe the user (userVisibleOnly allows to specify that we don't plan to
  // send notifications that don't have a visible effect for the user).
  registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey
  }).then(subscription => {
    handleSubscriptionOnServer(subscription)
      .then(success => {
          setState({ pushNotificationsDisabled: false, pushNotificationsOn: true });
       })
       .catch(error => {
          setState({ pushNotificationsDisabled: false, pushNotificationsOn: false });
       });
  })
  .catch(error => {
    if (Notification.permission === 'denied') {
      // The user denied the notification permission which
      // means we failed to subscribe and the user will need
      // to manually change the notification permission to
      // subscribe to push messages
      console.error('Permission for Notifications was denied');
      setState({ pushNotificationsBlocked: true, pushNotificationsDisabled: true });
    } else {
      // A problem occurred with the subscription, this can
      // often be down to an issue or lack of the gcm_sender_id
      // and / or gcm_user_visible_only
      console.error('Unable to subscribe to push.', error);
      setState({ pushNotificationsDisabled: false, pushNotificationsOn: false });
    }
  });
}

function unsubscribe(registration) {
  setState({ pushNotificationsDisabled: true });

  // To unsubscribe from push messaging, you need get the
  // subcription object, which you can call unsubscribe() on.
  registration.pushManager.getSubscription().then(subscription => {
    // Check we have a subscription to unsubscribe
    if (!subscription) {
      // No subscription object, so set the state
      // to allow the user to subscribe to push

      setState({ pushNotificationsDisabled: false, pushNotificationsOn: false });
      return;
    }

  handleSubscriptionOnServer(subscription, true);

    // We have a subcription, so call unsubscribe on it
    subscription.unsubscribe().then(() => {
      setState({ pushNotificationsDisabled: false, pushNotificationsOn: false });
    }).catch(error => {
      // We failed to unsubscribe, this can lead to
      // an unusual state, so may be best to remove
      // the subscription id from your data store and
      // inform the user that you disabled push

      console.error('Unsubscription error: ', error);
      setState({ pushNotificationsDisabled: false });
    });
  }).catch(error => {
    console.error('Error thrown while unsubscribing from push messaging.', error);
  });
}

function handleClick(registration) {
  const { pushNotificationsOn } = state;

  if (pushNotificationsOn) {
    unsubscribe(registration);
  } else {
    subscribe(registration);
  }
}

function setBackground(imagePath) {
  document.body.style.background = `url('${imagePath}')`;
}

document.addEventListener("DOMContentLoaded", function(event) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(registration => {
        initPushNotifications(registration);

        document.querySelector('.button').addEventListener('click', function(e) {
          handleClick(registration);
        });

        navigator.serviceWorker.addEventListener('message', function(event){
          if (event.data && event.data.icon) {
            setBackground(event.data.icon);
          }
        });
      });
  }
});
