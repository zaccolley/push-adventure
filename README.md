# push-notification-twine

use push notifications to play a (basic) twine story

*need to write a good readme, bare with me*

## install

requires [node and npm to be installed](https://docs.npmjs.com/getting-started/installing-node)

1. `npm install`
2. add environment variables for push notifciations to `.env`. you can use `.env-sample` as an example

## running

```
node main.js
```
> you need to be running on `localhost` or a server with https for this to work
> push notifications do not work in all browsers

## twine

this project uses [twine](https://twinery.org/), something that makes creating a story people easy. it uses the [twison json format exporter](https://github.com/lazerwalker/twison)

## example

you can find an example over at: https://push-notification-twine.glitch.me/

it's based on the famous "im just waiting for a mate" video: https://www.youtube.com/watch?v=71DIT6hYXYo