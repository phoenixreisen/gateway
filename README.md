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
// CommonJs
const Gateway = require('@phoenixreisen/gateway');

// oder

// ESM
import Gateway from '@phoenixreisen/gateway';
```

An zentraler Stelle API- & Error-Url setzen

```js
// Gateway/API mit Standardurls versorgen

Gateway.setApiErrorUrl(/* URL zu allg. error page */);
Gateway.setApiUrl(/* URL zu API-Endpunkt */);
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
[npm install]                       # Abhängigkeiten installieren
npm version [major|minor|patch]     # increase version x.x.x => major.minor.patch
npm publish                         # upload to npm
git push
```