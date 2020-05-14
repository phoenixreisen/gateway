export interface ResultType {
    type: 'success' | 'failure',
    [key: string]: any,
}

export interface ErrorType {
    status?: number,
    type: 'success' | 'failure',
    ['userfriendly-message']?: string,
    [key: string]: any,
}