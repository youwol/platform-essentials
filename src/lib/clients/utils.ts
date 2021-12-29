import { createObservableFromFetch } from '@youwol/flux-core';
import { Observable, of, Subject } from 'rxjs';
import { mergeMap, tap } from 'rxjs/operators';


export interface JsonMap { [member: string]: string | number | boolean | null | JsonArray | JsonMap };
export interface JsonArray extends Array<string | number | boolean | null | JsonArray | JsonMap> { }
export type Json = JsonMap | JsonArray | string | number | boolean | null;

/** 
  ## Abstract 
     
     This namespace encapsulates base classes allowing browsing,
     reading, and writing like a filesystem on a local computer.

     Usually, it is a thin layer that connects to a remote client who expose resources like a tree 
     (e.g. github, google drive). It may altought not always be the case, like the 
     [[LocalDrive]] shows.

     When deriving a new drive, the central task is implementing a new type of [[Interfaces.Drive]].
     One can also inherits from [[Interfaces.File]] and [[Interfaces.Folder]] to eventually add missing required features.

 */


export type RequestStep = 'started' | 'transferring' | 'processing' | 'finished'
export type RequestMethod = 'upload' | 'download' | 'delete' | 'query'

export class RequestFollower {

    public readonly targetId: string
    public readonly channels$: Array<Subject<RequestEvent>>
    public readonly requestId: string
    public readonly method: RequestMethod

    totalCount: number
    transferredCount: number

    constructor({ targetId, channels$, method }:
        {
            targetId: string,
            channels$: Subject<RequestEvent> | Array<Subject<RequestEvent>>,
            method: RequestMethod
        }) {
        this.targetId = targetId
        this.channels$ = Array.isArray(channels$) ? channels$ : [channels$]
        this.method = method
        this.requestId = `${Math.floor(Math.random() * 10000)}`
    }

    start(totalCount?: number) {
        this.totalCount = totalCount
        this.channels$.forEach(channel$ =>
            channel$.next({
                requestId: this.requestId,
                targetId: this.targetId,
                step: 'started',
                transferredCount: 0,
                totalCount: this.totalCount,
                method: this.method
            }))
    }

    progressTo(transferredCount: number, totalCount?: number) {
        this.totalCount = totalCount != undefined ? totalCount : this.totalCount
        this.transferredCount = transferredCount
        this.channels$.forEach(channel$ =>
            channel$.next({
                requestId: this.requestId,
                targetId: this.targetId,
                step: this.totalCount != undefined && this.transferredCount == this.totalCount
                    ? 'processing'
                    : 'transferring',
                transferredCount: this.transferredCount,
                totalCount: this.totalCount,
                method: this.method
            }))
    }

    end() {
        this.transferredCount = this.totalCount
        this.channels$.forEach(channel$ =>
            channel$.next({
                requestId: this.requestId,
                targetId: this.targetId,
                step: 'finished',
                transferredCount: this.transferredCount,
                totalCount: this.totalCount,
                method: this.method
            }))
    }

}

export interface RequestEvent {

    readonly requestId: string
    readonly targetId: string
    readonly method: RequestMethod
    readonly step: RequestStep
    readonly totalCount: number
    readonly transferredCount: number
}


export interface RequestOptions {
    /**
     * Request followers
     */
    channels$?: Subject<RequestEvent> | Array<Subject<RequestEvent>>,

    /**
     * Headers provided with the request, attributes are merged with the ones provided at client's construction
     */
    headers?: Json

    /**
     * request label used in the events emitted in events$
     */
    requestId?: string
}


export function resolveRequest<T = unknown>(request: Request, method: RequestMethod, options: RequestOptions): Observable<T> {

    let { requestId, channels$ } = options

    if (!channels$) {
        return createObservableFromFetch(request)
    }

    let follower = new RequestFollower({
        targetId: requestId,
        channels$,
        method
    })

    return of({}).pipe(
        tap(() => follower.start(1)),
        mergeMap(() => createObservableFromFetch(request)),
        tap(() => follower.end())
    ) as Observable<T>
}


export function send(method: RequestMethod, path: string, optionsNative?, optionsExtra?: RequestOptions) {

    let { requestId, channels$ } = optionsExtra

    let request = new Request(
        path,
        optionsNative
    );

    if (!channels$) {
        return createObservableFromFetch(request)
    }

    let follower = new RequestFollower({
        targetId: requestId || path,
        channels$,
        method
    })

    return of({}).pipe(
        tap(() => follower.start(1)),
        mergeMap(() => createObservableFromFetch(request)),
        tap(() => follower.end())
    ) as any
}
