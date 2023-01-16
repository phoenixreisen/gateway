/**
 * Tests für Phoenix Gateway.
 */
const Gateway = require('../src/gateway').default;
const jwt = require('jsonwebtoken');

describe('Gateway / API handler', () => {

    const token = jwt.sign({
        pwd: true,
        sub: 'fabian',
        roles: ['phoenixmitarbeiter'],
        data: 'ICH BIN JON SNOW, KÖNIG DES NORDENS UND ICH HABE MEINE TANTE GEBUMST.',
        exp: new Date(new Date().getTime() + 24*60*60*1000).getTime(),
    }, 'shhhhh');

    beforeEach(() => {
        spyOn(Gateway, 'setLogger').and.callThrough();
        spyOn(Gateway, 'setApiUrl').and.callThrough();
        spyOn(Gateway, 'setApiErrorUrl').and.callThrough();
    });

    afterEach(() => {
        Gateway.setApiUrl.calls.reset();
        Gateway.setApiErrorUrl.calls.reset();
    });

    it('should provide setter functions for module variables', () => {
        const logger = (input) => input;

        Gateway.setLogger(logger);
        Gateway.setApiUrl('https://www.I-am-the-API-address.fu');
        Gateway.setApiErrorUrl('https://www.I-am-the-API-error-address.fu');

        expect(Gateway.setLogger).toHaveBeenCalled();
        expect(Gateway.setApiUrl).toHaveBeenCalled();
        expect(Gateway.setApiErrorUrl).toHaveBeenCalled();
    });
});