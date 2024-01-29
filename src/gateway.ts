/**
 * Speziell auf Bedürfnisse von Phoenix Reisen zugeschnittenes/optimiertes API Modul.
 *
 * @author Phoenix Reisen <it@phoenixreisen.com>
 * @author Fabian Marcus <f.marcus@phoenixreisen.com>
 * @copyright Phoenix Reisen GmbH
 */
import m from 'mithril';


//--- Types -----

/**
 * Webtexte werden gebündelt abgefragt und in einem 
 * Objekt bestehend aus key-string-Paaren zurückgegeben.
 */
export type Webtexts = {
    [key: string]: string
}

/**
 * Berechtigungen werden als Array von Objekten zurückgegeben.
 * Eine Berechtigung besteht aus dem Namen des Moduls und der 
 * erlaubten Aktion.
 */
export type Permission = {
    'modul': string,
    'aktion': string
}

/**
 * Ein erfolgreicher Request liefert ein Objekt mit "type" "success" zurück.
 * "status" ist deprecated. Alle weiteren Eigenschaften sind vom 
 * aufgerufenen Service abhängig.
 */
export type ApiResult = {
    'type'?: 'success' | 'failure',
    'status'?: 'success' | 'failure',
    [key: string]: any,
}

/**
 * Ein fehlerhafter Request liefert ein Objekt mit "type" "failure" zurück.
 * "status" ist deprecated. "error-code" ist ein eindeutiger Fehlercode String.
 * "userfriendly-message" ist eine Fehlermeldung, die dem Benutzer angezeigt werden kann.
 * "details" ist ein Text oder Objekt mit weiteren Informationen zum Fehler.
 */
export type ApiError = Error & {
    'type'?: 'failure',
    'status'?: string,
    'details'?: unknown,
    'error-code'?: string,
    'userfriendly-message'?: string,
    [key: string]: any,
}

/**
 * Wenn das Backend keinen spezifischen Fehler zurückgibt,
 * sondern ein Netzwerkfehler auftritt, wird ein HttpError
 * zurückgegeben. Dazu erweitern wir hier den Error-Typ um
 * die Eigenschaft "status" für einen Statuscode.
 */
export type HttpError = Error & {
    'status': number,
}

/**
 * Parameter, die an einen Service übergeben werden.
 * Die Eigenschaften sind vom aufgerufenen Service abhängig.
 */
export type ServiceParams = {[key: string]: any};

/**
 * Logging-Funktion, die bei einem Fehler aufgerufen wird.
 */
export type Logger = (error: any) => void;


//--- Variablen -----

/**
 * URL auf die bei einem Fehlerhaften Statuscode
 * redirected wird.
 */
let redirectUrl: string = '';

/**
 * Standard API-Url um einen Service
 * mit callService anzusprechen.
 */
let apiUrl: string = '';

/**
 * Maximale Anzahl an Fehlversuchen.
 */
let maxRetries: number = 3;

/**
 * Funktion zum Loggen einer Fehlermeldung
 * z.B. Sentrys captureException()
 */
let logger: Logger;


//--- Funktionen -----

/**
 * Bringt ein Javascript-Objekt in form data-Syntax.
 * Wird bei "callService" verwendet.
 * @param data Objekt, das in form data-Syntax gebracht werden soll
 * @returns FormData oder URLSearchParams
 * @see callService()
 */
export function parseFormData(data: {[key: string]: string | number}): FormData | URLSearchParams {
    const res = (typeof FormData !== 'undefined')
        ? new FormData() 
        : new URLSearchParams();

    for(const name in data) {
        if(Object.prototype.hasOwnProperty.call(data, name)) {
            const val = data[name].toString();
            res.append(name, val);
        }
    }
    return res;
}

/**
 * Setzt die generelle URL der API.
 */
export function setApiUrl(url: string): void {
    apiUrl = url;
}

/**
 * Setzt die URL für die allgemeine Errorseite
 * bei Fehler mit Status zwischen 400 und 500.
 */
export function setApiErrorUrl(url: string): void {
    redirectUrl = url;
}

/**
 * Überschreibt die maximale Anzahl an Fehlversuchen. (Default: 3)
 * @param retries Maximale Anzahl an Fehlversuchen.
 */
export function setMaxRetries(retries: number): void {
    maxRetries = retries;
}

/**
 * Setzt die Logging-Funktion.
 */
export function setLogger(fn: Logger): void {
    logger = fn;
}

/**
 * Spricht über das Gateway einen beliebigen PHX Service an.
 * Es werden (je nach Einstellung von maxRetries) mehrere Requests
 * gesendet, bis erfolglos abgebrochen wird. Das gilt auch für den Fall,
 * dass der Request zwar durchgeht, aber vom API ein Failure-Result zurückkommt.
 * Die Aufrufsignatur der einzelnen Services kann im Service Monitor nachgesehen werden.
 * @param name Name des Services
 * @param params Parameter des Services
 * @param url URL des Services (optional)
 * @param delay Verzögerung zwischen den Retry Requests in ms (optional, default: 1000)
 * @param retries Maximale Anzahl an Fehlversuchen (optional, default: 3)
 * @see https://stackoverflow.com/questions/38213668/promise-retry-design-patterns
 */
export async function callService(name: string, params: ServiceParams, url?: string, delay = 1500, retries = maxRetries): Promise<unknown> {
    if(!url && !apiUrl) {
        throw 'API Url needs to be set as parameter oder as module variable via setApiUrl().';
    }
    return new Promise((resolve, reject) => {
        let error = null;
        const attempt = () => {
            if(retries <= 0) {
                reject(error);
            } else {
                requestAPI(name, params, url)
                    .then(resolve)
                    .catch((reason) => {
                        retries -= 1;
                        error = reason;
                        setTimeout(() => attempt(), delay);
                    });
            }
        };
        attempt();
    });
}


/**
 * Spricht über das Gateway einen beliebigen PHX Service an.
 * Es wird nur ein Request abgesendet. Die Funktion "callService()" wrappt
 * diese Funktion und sendet (je nach Einstellung) mehrere Requests, bis erfolglos 
 * abgebrochen wird. Es ist also empfehlenswert, "callService()" zu verwenden.
 * Ist im Modul ein Logger gesetzt, werden Failures in Sentry geloggt.
 * Bei Failures mit Statuscode zwischen 400 und 500 wird auf eine allgemeine Fehlerseite geleitet.
 * @param name Name des Services
 * @param params Parameter des Services
 * @param url URL des Services (optional)
 */
async function requestAPI(name: string, params: ServiceParams, url?: string): Promise<unknown> {
    if(!url && !apiUrl) {
        throw 'API Url needs to be set as parameter oder as module variable via setApiUrl().';
    }
    return m.request({
        method: 'POST',
        url: url || apiUrl,
        body: parseFormData({
            'service-name': name,
            'input-params': JSON.stringify(params),
        }),
    }).then((result: unknown) => {
        if(!result) {
            throw result;
        }
        if((result as ApiResult).type
        && (result as ApiResult).type !== 'success') {
            throw result;
        }
        if((result as ApiResult).status
        && (result as ApiResult).status !== 'success') {
            throw result;
        }
        return result;
    }).catch((error: HttpError) => {
        if(error?.status && error.status >= 400) {
            if(logger) {
                try {
                    const stringified = JSON.stringify(error);
                    logger(Error(stringified));
                } catch(e) {
                    console.error(e);
                }
            }
            if(redirectUrl) {
                location.href = redirectUrl;
            }
        }
        throw error;
    });
}

/**
 * Webtexte abfragen und in den SessionStorage cachen.
 * @param categories Liste der abzufragenden Kategorienamen
 * @param key Name, unter dem im SessionStorage abgespeichert werden soll
 * @param triptypes Art der Reise (See, Fluss, Orient)
 */
export async function loadWebtexte(categories: Array<string>, key: string, triptypes?: Array<string> | string): Promise<Webtexts> {
    const hasSessionStore = (typeof sessionStorage !== 'undefined');
    
    const types = triptypes
        ? !Array.isArray(triptypes)
            ? [ triptypes ]
            : triptypes
        : null;

    const webtexts = (key && hasSessionStore) 
        ? sessionStorage.getItem(key) 
        : null;
    
    if(webtexts) {
        return Promise.resolve(JSON.parse(webtexts) as Webtexts);
    }
    return callService('webtexte.get-webtexte', {
        'kategorien': categories,
        'reiseart': types,
    }).then((result) => {
        const webtexts = result as Webtexts;

        if(key && hasSessionStore) {
            sessionStorage.setItem(key, JSON.stringify(webtexts));
        }
        return webtexts;
    });
}

/**
 * Fragt am API die Berechtigungen eines Benutzers ab. 
 * Die Rückgabe wird im sessionStorage gecached.
 * @param jwt JWT des Benutzers
 * @param storageKey Name, unter dem im SessionStorage abgespeichert werden soll
 */
export async function getPermissions(jwt: string, storageKey: string): Promise<Array<Permission>> {
    const hasSessionStore = (typeof sessionStorage !== 'undefined');

    if(!jwt || !storageKey) {
        throw 'JWT and storageKey are required.';
    }

    const permissions = hasSessionStore
        ? sessionStorage.getItem(storageKey)
        : null;

    if(permissions) {
        const parsed = JSON.parse(permissions) as Array<Permission>;
        return Promise.resolve(parsed);
    }

    const result = await callService('phxauth.get-berechtigungen', {
        type: 'get-berechtigungen',
        jwt: jwt,
    }) as Array<Permission>;

    if(storageKey && hasSessionStore) {
        sessionStorage.setItem(storageKey, JSON.stringify(result));
    }
    return result as Array<Permission>;
}

/**
 * Prüft, ob ein Benutzer eine bestimmte Berechtigung hat.
 * @param jwt JWT des Benutzers
 * @param storageKey Name, unter dem die Berechtigungen im sessionStorage zu finden sein könnten
 * @param permission Bezeichnung, der zu prüfenden Berechtigung
 */
export async function hasPermission(jwt: string, storageKey: string, permission: string): Promise<boolean> {
    const permissions = await getPermissions(jwt, storageKey);
    return permissions.some((perm) => {
        if(perm?.aktion) {
            return perm.aktion === permission;
        }
        return false;
    });
}

export default {
    setLogger,
    setApiUrl,
    setMaxRetries,
    setApiErrorUrl,
    parseFormData,
    callService,
    loadWebtexte,
    getPermissions,
    hasPermission,
};