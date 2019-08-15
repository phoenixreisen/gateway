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
 * @type {string}
 * @private
 */
let errorUrl = '';

/**
 * Standard API-Url um einen Service 
 * mit callService anzusprechen.
 * @type {string}
 * @private
 */
let apiUrl = '';


/** 
 * Setzt die generelle URL der API.
 * @param {string} url
 * @returns {void}
 * @public 
 */
function setApiUrl(url) {
    apiUrl = url;
}

/** 
 * Setzt die URL für die allgemeine
 * Errorseite bei Fehler mit Status
 * zwischen 400 und 500.
 * @param {string} url
 * @returns {void}
 * @public
 */
function setApiErrorUrl(url) {
    errorUrl = url;
}


/**
 * Bringt ein Javascript-Objekt in form data-Syntax.
 * Wird bei "callService" verwendet.
 * @param {Object} data 
 * @returns {FormData}
 * @private
 */
function parseFormData(data) {
    const res = new FormData();
    for(let name in data) {
        if(!Object.prototype.hasOwnProperty.call(data, name)) {
            continue;
        }
        let val = data[name];
        res.append(name, val);
    }
    return res;
}

/**
 * Spricht über das Gateway einen beliebigen Service an. (Siehe WMQ-Monitor)
 * @param {String} name - Name des Gatways 
 * @param {Object} params - Get/Post-Parameter 
 * @returns {Promise}
 * @public
 */
async function callService(name, params, url=null) {
    return m.request({
        method: 'POST',
        url: url || apiUrl,
        body: parseFormData({
            'service-name': name,
            'input-params': JSON.stringify(params),
        }),
    }).then(result => {
        if(!result || (result.type && result.type !== 'success')) {
            throw result;
        }
        return result;
    }).catch(error => {
        if(error && error.status 
        && error.status >= 400 
        && error.status <= 500) {
            location.href = errorUrl;
            return;
        }
        throw error;
    });
}

/**
 * Holt die Webtexte eines Service.
 * @param {Array} categories 
 * @param {String} key 
 * @returns {Promise}
 * @public 
 */
async function loadWebtexte(categories, key) {
    if(key) {
        try {
            const webtexte = sessionStorage.getItem(key);
            if(webtexte) {
                return Promise.resolve(JSON.parse(webtexte));
            }
        }
        catch(e) { /* nichts */}
    }
    return callService('webtexte.get-webtexte', { 'kategorien': categories })
        .then(result => {
            if(key) {
                try { sessionStorage.setItem(key, JSON.stringify(result)); } 
                catch(e) { /* nichts. */ }
            }
            return result;
        });
}

export {
    setApiUrl,
    setApiErrorUrl,
    callService,
    loadWebtexte,
};

export default {
    setApiUrl,
    setApiErrorUrl,
    callService,
    loadWebtexte,
};