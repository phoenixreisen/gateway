# Phoenix Reisen API Modul

Speziell auf Bedürfnisse von Phoenix Reisen zugeschnittenes/optimiertes API Modul.

Eine genaue Schittstellen-Beschreibung eines jeweiligen Endpunktes kann im WMQ (nur Intranet) nachgeschaut werden.

## Installation

```bash
npm install --save @phoenixreisen/gateway
```

## Awendung

Modul importieren

```js
const Gateway = require('@phoenixreisen/gateway');

// oder

import Gateway from '@phoenixreisen/gateway');
```

An zentraler Stelle API- & Error-Url setzen

```js
// Gateway/API mit Standardurls versorgen

Gateway.setApiErrorUrl(Config.urls.API_ERROR);
Gateway.setApiUrl(`${Config.urls.GATEWAY}/call-json-service`);
```

Daten abfragen

```js
async getCatalog(id) {
    return Gateway.callService('katalog.katalogbestellung-config', {
        'type': 'get-katalogbestellung-config',
        'katalog-kennung': id,
    });
}
```

## Deployment

```bash

npm version [major|minor|patch]     # increase version x.x.x => major.minor.patch
npm publish                         # upload to npm

hg bzw. git commit package.json package-lock.json -m "(npm) version increased"
hg bzw. git push
```