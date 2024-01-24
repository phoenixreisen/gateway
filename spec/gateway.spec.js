/**
 * Tests für Phoenix Gateway.
 */
const m = require('mithril');
const jwt = require('jsonwebtoken');
const Gateway = require('../src/gateway').default;

Object.assign(global, {
    location: { href: '' }
});

describe('Gateway/API handler', () => {

    const token = jwt.sign({
        pwd: true,
        sub: 'fabian',
        roles: ['phoenixmitarbeiter'],
        data: 'ICH BIN JON SNOW, KÖNIG DES NORDENS UND ICH HABE MEINE TANTE GEBUMST.',
        exp: new Date(new Date().getTime() + 24*60*60*1000).getTime(),
    }, 'shhhhh');

    const params = {
        token: token,
        rechnr: 123456,
        prename: 'Fabian',
        surname: 'XXX',
    };

    const url = 'https://www.I-am-the-API-address.fu';
    const redirect = 'https://www.I-am-the-API-error-address.fu';

    //-----

    beforeEach(() => {
        mockLocalStorage();
        global.sessionStorage = localStorage;
    });

    it('should provide setter functions for module variables', () => {
        spyOn(Gateway, 'setLogger').and.callThrough();
        spyOn(Gateway, 'setApiUrl').and.callThrough();
        spyOn(Gateway, 'setApiErrorUrl').and.callThrough();

        Gateway.setApiUrl(url);
        Gateway.setApiErrorUrl(redirect);
        Gateway.setLogger(() => {});

        expect(Gateway.setLogger).toHaveBeenCalledTimes(1);
        expect(Gateway.setApiUrl).toHaveBeenCalledTimes(1);
        expect(Gateway.setApiErrorUrl).toHaveBeenCalledTimes(1);
    });

    it('should parse parameters correctly in form data structure', () => {
        const requestParams = `token=${token}&rechnr=123456&prename=Fabian&surname=XXX`;
        const formdata = Gateway.parseFormData(params);
        const decoded = new URLSearchParams(formdata);

        expect(decoded.toString()).toEqual(requestParams);
        expect(typeof formdata).toBe('object');

        expect(decoded.get('rechnr')).toBe('123456');
        expect(decoded.get('prename')).toBe('Fabian');
        expect(decoded.get('surname')).toBe('XXX');
    });

    it('should call the API and chain results from it correctly when type is success', () => {
        
        spyOn(m, 'request').and.callFake(() => Promise.resolve({
            type: 'success',
            result: {
                job: 'Agent',
                status: 'alamiert'
            }
        }));

        Gateway.callService('mocked-service', params, url)
            .then(result => {
                expect(result).toEqual({
                    type: 'success',
                    result: {
                        job: 'Agent',
                        status: 'alamiert'
                    }
                });
            })
            .catch((error) => {
                expect(error).toBe('I should not even be called!');
            });
    });

    it('should not enter then() when type is failure, instead go directly to catch()', () => {
        
        const spy = spyOn(m, 'request').and.callFake(() => Promise.resolve({
            type: 'failure',
            result: {
                job: 'Gaylord',
                status: 'straight'
            }
        }));

        Gateway.callService('mocked-service', params, url)
            .then((result) => {
                expect(result).toBe('I should not even be called!');
            })
            .catch((error) => {
                expect(error).toEqual({
                    type: 'failure',
                    result: {
                        job: 'Gaylord',
                        status: 'straight'
                    }
                });

                // 3 (Re-)tries should have been made
                expect(spy).toHaveBeenCalledTimes(3);
            });
    });

    it('should call the API and catch server errors from it correctly', async () => {
        const failure = {
            status: 500,
            message: "Server Fehler!"
        };
        const logger = (input) => {
            expect(JSON.parse(input.message)).toEqual(failure);
        };
        
        Gateway.setApiUrl(url);
        Gateway.setApiErrorUrl(redirect);
        Gateway.setLogger(logger);

        const mspy = spyOn(m, 'request').and.callFake(() => Promise.reject(failure));

        await Gateway.callService('mocked-service', params, url)
            .then((result) => {
                expect(result).toBe('I should not even be called!');
            })
            .catch((error) => {
                expect(JSON.stringify(error)).toEqual(JSON.stringify(failure));
                expect(mspy).toHaveBeenCalledTimes(3); // 3 request (re)tries
                expect(global.location.href).toBe(redirect)
            });
    });

    it('should fetch webtexts correctly', async () => {
        const result = {
            alarm: 'Großer Penis entdeckt!',
            style: 'Pool, Teich, See oder Meer?'
        };
        Gateway.setApiUrl(url);
        Gateway.setApiErrorUrl(redirect);

        spyOn(m, 'request').and.callFake(() => Promise.resolve(result));

        await Gateway.loadWebtexte(Object.keys(result), 'life-of-fabe')
            .then(webtexts => expect(webtexts).toEqual(result))
            .catch(error => expect(error).toBe('I should not even be called!'));
    });

    it('should catch errors correctly while fetching webtexts', async () => {
        const failure = {
            status: 500,
            message: 'Server Fehler!',
        };
        Gateway.setApiUrl(url);
        Gateway.setApiErrorUrl(redirect);

        try {
            spyOn(m, 'request').and.callFake(() => Promise.reject(failure));
            const webtexts = await Gateway.loadWebtexte(Object.keys(['alarm', 'style']), 'life-of-fabe');
            expect(webtexts).toBe('I should not even be called!')
        } catch(error) {
            expect(error).toEqual(failure);
        }
    });
    
    it('should make use of sessionStorage correctly to cache results', async () => {
        Gateway.setApiErrorUrl(redirect);
        Gateway.setApiUrl(url);

        const result = {
            alarm: 'Großer Penis entdeckt!',
            style: 'Pool, Teich, See oder Meer?',
            wisdom: 'Egal wie still du bist, Ben ist stiller',
        };
        const key = 'cache-test';
        const sessionStorage = global.localStorage;
        const mspy = spyOn(m, 'request').and.callFake(() => Promise.resolve(result));

        try {
            const webtexts = await Gateway.loadWebtexte(Object.keys(result), key);
            expect(webtexts).toEqual(result);
            
            expect(sessionStorage.getItem).toHaveBeenCalledTimes(1);
            expect(mspy).toHaveBeenCalledTimes(3); // 3 request tries
            expect(sessionStorage.setItem).toHaveBeenCalledTimes(1);
            
            expect(JSON.parse(sessionStorage.getItem(key))).toEqual(result);
            expect(sessionStorage.getItem(key)).toEqual(JSON.stringify(result));

            mspy.calls.reset();
            sessionStorage.getItem.calls.reset();
            sessionStorage.setItem.calls.reset();

            // Now get webtexts from sessionStorage, no API call needed
            await Gateway.loadWebtexte(Object.keys(result), key);
            expect(sessionStorage.getItem).toHaveBeenCalledTimes(1);
            expect(mspy).not.toHaveBeenCalled();
            expect(sessionStorage.setItem).not.toHaveBeenCalled();
        } catch(error) {
            expect(error).toBe('I should not even be called!');
        }
    });

    it('should make use of sessionStorage to cache and deliver saved permissions', async () => {
        Gateway.setApiErrorUrl(redirect);
        Gateway.setApiUrl(url);

        const result = [
            { 'modul': 'modul-1', 'permission': 'permission-1' },
            { 'modul': 'modul-2', 'permission': 'permission-2' },
            { 'modul': 'modul-3', 'permission': 'permission-3' },
            { 'modul': 'modul-4', 'permission': 'permission-4' },
            { 'modul': 'modul-5', 'permission': 'permission-5' },
        ];
        const key = 'cache-test';
        const sessionStorage = global.localStorage;
        const mspy = spyOn(m, 'request').and.callFake(() => Promise.resolve(result));

        try {
            const perms = await Gateway.getPermissions(token, key);
            expect(perms).toEqual(result);
            
            expect(sessionStorage.getItem).toHaveBeenCalledTimes(1);
            expect(mspy).toHaveBeenCalledTimes(3); // 3 request tries
            expect(sessionStorage.setItem).toHaveBeenCalledTimes(1);
            
            expect(JSON.parse(sessionStorage.getItem(key))).toEqual(result);
            expect(sessionStorage.getItem(key)).toEqual(JSON.stringify(result));

            mspy.calls.reset();
            sessionStorage.getItem.calls.reset();
            sessionStorage.setItem.calls.reset();

            // Now get permissions from sessionStorage, no API call needed
            await Gateway.getPermissions(token, key);
            expect(sessionStorage.getItem).toHaveBeenCalledTimes(1);
            expect(mspy).not.toHaveBeenCalled();
            expect(sessionStorage.setItem).not.toHaveBeenCalled();
        } catch(e) {
            expect(error).toBe('I should not even be called!');
        }
    });

    it('should correctly determine if a user has a permission', async () => {
        Gateway.setApiErrorUrl(redirect);
        Gateway.setApiUrl(url);

        const result = [
            { 'modul': 'modul-1', 'aktion': 'permission-1' },
            { 'modul': 'modul-2', 'aktion': 'permission-2' },
            { 'modul': 'modul-3', 'aktion': 'permission-3' },
            { 'modul': 'modul-4', 'aktion': 'permission-4' },
            { 'modul': 'modul-5', 'aktion': 'permission-5' },
        ];
        const key = 'phx-permissions';
        const mspy = spyOn(m, 'request').and.callFake(() => Promise.resolve(result));
        
        try {
            const hasPerm = await Gateway.hasPermission(token, key, 'permission-3');
            expect(hasPerm).toBe(true);
            expect(mspy).toHaveBeenCalledTimes(3);

            const hasPerm2 = await Gateway.hasPermission(token, key, 'spermission-3');
            expect(hasPerm2).toBe(false);
            expect(mspy).toHaveBeenCalledTimes(3);
            expect(sessionStorage.setItem).toHaveBeenCalledTimes(1);
            expect(sessionStorage.getItem).toHaveBeenCalledTimes(2);
        } catch(e) {
            expect(error).toBe('I should not even be called!');
        }
    });
});