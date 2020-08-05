'use strict';

const { RTMClient } = require('@slack/rtm-api');
const { WebClient } = require('@slack/web-api');

function Slack (skyfall) {
  const connections = new Map();
  const names = new Map();

  this.connection = (id) => {
    if (connections.has(id)) {
      return connections.get(id);
    } else if (names.has(id)) {
      return names.get(id);
    }
    return false;
  };

  this.connect = function({ name, token } = {}) {
    const id = skyfall.utils.id();
    const web = new WebClient(token);
    const rtm = new RTMClient(token);

    const connection = {
      id,
      name,
      self: null,
      team: null,
      get connected () {
        return rtm.connected;
      },
    };
    connections.set(id, connection);
    names.set(name, connection);

    rtm.on('slack_event', (type, event) => {
      skyfall.events.emit({
        type: `slack:${ name }:${ type }`,
        data: event,
        source: id,
      });
    });

    rtm.on('connecting', () => {
      skyfall.events.emit({
        type: `slack:${ name }:connecting`,
        data: connection,
        source: id,
      });
    });

    rtm.on('connected', () => {
      skyfall.events.emit({
        type: `slack:${ name }:connected`,
        data: connection,
        source: id,
      });
    });

    rtm.on('error', (error) => {
      skyfall.events.emit({
        type: `slack:${ name }:error`,
        data: error,
        source: id,
      });
    });

    skyfall.events.on(`slack:${ name }:send`, (event) => {
      web.chat.postMessage(event.data);
    });

    return rtm.start().
      then(({ self, team }) => {
        connection.self = self;
        connection.team = team;

        return connection;
      });
  };
}

module.exports = {
  name: 'slack',
  install: (skyfall, options) => {
    skyfall.slack = new Slack(skyfall, options);
  },
};
