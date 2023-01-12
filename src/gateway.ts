/**
 * Speziell auf Bedürfnisse von Phoenix Reisen zugeschnittenes/optimiertes API Modul.
 *
 * @author Phoenix Reisen <it@phoenixreisen.com>
 * @author Fabian Marcus <f.marcus@phoenixreisen.com>
 * @copyright Phoenix Reisen GmbH
 */
import m from 'mithril';


//--- Types -----

export type ApiResult = {
    'type'?: 'success' | 'failure',
    'status'?: 'success' | 'failure',
    [key: string]: unknown,
}

export type ApiError = Error & {
    'type'?: 'failure',
    'status'?: string | number,
    'userfriendly-message'?: string,
    [key: string]: unknown,
}


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
 * Spricht über das Gateway einen beliebigen Service an. (Siehe WMQ-Monitor)
 */
export async function callService(name: string, params: {[key: string]: any}, url?: string): Promise<ApiResult | void> {
    return m.request<ApiResult>({
        method: 'POST',
        url: url || apiUrl,
        body: parseFormData({
            'service-name': name,
            'input-params': JSON.stringify(params),
        }),
    }).then((result: ApiResult) => {
        if(!result
        || result.type !== 'success'
        || result.status !== 'success') {
            throw result;
        }
        return result;
    }).catch((error: ApiError) => {
        if(error && redirectUrl
        && error.status
        && error.status >= 400) {
            location.href = redirectUrl;
        } else {
            throw error;
        }
    });
}

/**
 * Holt die Webtexte eines Service.
 */
export async function loadWebtexte(categories: Array<string>, key: string, triptypes: Array<string> | string | null = null): Promise<any> {
    const types = triptypes
        ? !Array.isArray(triptypes)
            ? [ triptypes ]
            : triptypes
        : null;

    if(key) {
        try {
            const webtexte = sessionStorage.getItem(key);
            if(webtexte) {
                return Promise.resolve(JSON.parse(webtexte));
            }
        } catch(e) {
            /* nichts */
        }
    }
    return callService('webtexte.get-webtexte', {
        'kategorien': categories,
        'reiseart': types,
    }).then(result => {
        if(key) {
            try {
                sessionStorage.setItem(key, JSON.stringify(result));
            } catch(e) {
                /* nichts. */
            }
        }
        return result;
    });
}

export default {
    setApiUrl,
    setApiErrorUrl,
    callService,
    loadWebtexte,
};