export interface ResultType {
    type: 'success' | 'failure';
    [key: string]: any;
}
export interface ErrorType {
    status?: number;
    type: 'success' | 'failure';
    ['userfriendly-message']?: string;
    [key: string]: any;
}
/**
 * Setzt die generelle URL der API.
 */
export declare function setApiUrl(url: string): void;
/**
 * Setzt die URL für die allgemeine Errorseite
 * bei Fehler mit Status zwischen 400 und 500.
 */
export declare function setApiErrorUrl(url: string): void;
/**
 * Spricht über das Gateway einen beliebigen Service an. (Siehe WMQ-Monitor)
 */
export declare function callService(name: string, params: {
    [key: string]: any;
}, url?: string): Promise<void | ResultType>;
/**
 * Holt die Webtexte eines Service.
 */
export declare function loadWebtexte(categories: Array<string>, key: string, triptypes?: Array<string> | string): Promise<any>;
declare const _default: {
    setApiUrl: typeof setApiUrl;
    setApiErrorUrl: typeof setApiErrorUrl;
    callService: typeof callService;
    loadWebtexte: typeof loadWebtexte;
};
export default _default;
