/**
 * Speziell auf Bedürfnisse von Phoenix Reisen zugeschnittenes/optimiertes API Modul.
 *
 * @author Phoenix Reisen <it@phoenixreisen.com>
 * @author Fabian Marcus <f.marcus@phoenixreisen.com>
 * @copyright Phoenix Reisen GmbH
 */
import m from 'mithril';


//--- Types -----

export type Webtexts = {
    [key: string]: string
}

export type ApiResult = {
    'type'?: 'success' | 'failure',
    'status'?: 'success' | 'failure',
    [key: string]: any,
}

export type ApiError = Error & {
    'type'?: 'failure',
    'status'?: string,
    'details'?: unknown,
    'error-code'?: string,
    'userfriendly-message'?: string,
    [key: string]: any,
}

export type HttpError = Error & {
    'status': number,
}

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
 * Funktion zum Loggen einer Fehlermeldung
 * z.B. Sentrys captureException()
 */
let logger: Logger;


//--- Funktionen -----

/**
 * Bringt ein Javascript-Objekt in form data-Syntax.
 * Wird bei "callService" verwendet.
 */
function parseFormData(data: {[key: string]: string | number}): FormData {
    const res = new FormData();
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
 * Setzt die Logging-Funktion.
 */
export function setLogger(fn: Logger): void {
    logger = fn;
}

/**
 * Spricht über das Gateway einen beliebigen PHX Service an. 
 * Siehe Service Monitor für Dokumentation.
 */
export async function callService(name: string, params: {[key: string]: any}, url?: string): Promise<unknown> {
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
                    logger(error);
                } catch(e) {
                    console.error(e);
                }
            }
            if(redirectUrl) {
                location.href = redirectUrl;
            }
        } else {
            throw error;
        }
    });
}

/**
 * Webtexte abfragen
 * @param categories Liste der abzufragenden Kategorienamen
 * @param key Name, unter dem im SessionStorage abgespeichert werden soll
 * @param triptypes Art der Reise (See, Fluss, Orient)
 */
export async function loadWebtexte(categories: Array<string>, key: string, triptypes?: Array<string> | string): Promise<Webtexts> {
    const types = triptypes
        ? !Array.isArray(triptypes)
            ? [ triptypes ]
            : triptypes
        : null;

    const webtexts = key ? sessionStorage.getItem(key) : null;
    
    if(webtexts) {
        return Promise.resolve(JSON.parse(webtexts) as Webtexts);
    }
    return callService('webtexte.get-webtexte', {
        'kategorien': categories,
        'reiseart': types,
    }).then((result) => {
        const webtexts = result as Webtexts;

        if(key) {
            sessionStorage.setItem(key, JSON.stringify(webtexts));
        }
        return webtexts;
    });
}

export default {
    setLogger,
    setApiUrl,
    setApiErrorUrl,
    callService,
    loadWebtexte,
};