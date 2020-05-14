import {ResultType, ErrorType} from './gateways';
import m from 'mithril';

/**
 * Speziell auf Bedürfnisse von Phoenix Reisen zugeschnittenes/optimiertes API Modul.
 *
 * @author Phoenix Reisen <it@phoenixreisen.com>
 * @author Fabian Marcus <f.marcus@phoenixreisen.com>
 * @copyright Phoenix Reisen GmbH
 */

/**
 * URL auf die bei einem Fehlerhaften Statuscode
 * redirected wird.
 */
let errorUrl: string = '';

/**
 * Standard API-Url um einen Service
 * mit callService anzusprechen.
 */
let apiUrl: string = '';


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
    errorUrl = url;
}

/**
 * Spricht über das Gateway einen beliebigen Service an. (Siehe WMQ-Monitor)
 */
export async function callService(name: string, params: {[key: string]: any}, url: string = null) {
    return m.request({
        method: 'POST',
        url: url || apiUrl,
        body: parseFormData({
            'service-name': name,
            'input-params': JSON.stringify(params),
        }),
    }).then((result: ResultType) => {
        if(!result || (result?.type !== 'success')) {
            throw result;
        }
        return result;
    }).catch((error: ErrorType) => {
        if(error?.status
        && error.status >= 400
        && error.status <= 500) {
            location.href = errorUrl;
        } else {
            throw error;
        }
    });
}

/**
 * Holt die Webtexte eines Service.
 */
export async function loadWebtexte(categories: Array<string>, key: string, triptypes: Array<string> | string = null): Promise<any> {
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