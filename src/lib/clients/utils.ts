import { createObservableFromFetch } from '@youwol/flux-core';
import { Observable, of, ReplaySubject, Subject } from 'rxjs';
import { map, mergeMap, tap } from 'rxjs/operators';


export type BodyContentType = 'text/plain' | 'application/json'


export interface JsonMap { [member: string]: string | number | boolean | null | JsonArray | JsonMap };
export interface JsonArray extends Array<string | number | boolean | null | JsonArray | JsonMap> { }
export type Json = JsonMap | JsonArray | string | number | boolean | null;


export type RequestStep = 'started' | 'transferring' | 'processing' | 'finished'


export type CommandType = 'upload' | 'download' | 'create' | 'update' | 'delete' | 'query'


export class RequestFollower {

    public readonly targetId: string
    public readonly channels$: Array<Subject<RequestEvent>>
    public readonly requestId: string
    public readonly commandType: CommandType

    totalCount: number
    transferredCount: number

    constructor({ targetId, channels$, commandType }:
        {
            targetId: string,
            channels$: Subject<RequestEvent> | Array<Subject<RequestEvent>>,
            commandType: CommandType
        }) {
        this.targetId = targetId
        this.channels$ = Array.isArray(channels$) ? channels$ : [channels$]
        this.commandType = commandType
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
                commandType: this.commandType
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
                commandType: this.commandType
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
                commandType: this.commandType
            }))
    }

}

export interface RequestEvent {

    readonly requestId: string
    readonly targetId: string
    readonly commandType: CommandType
    readonly step: RequestStep
    readonly totalCount: number
    readonly transferredCount: number
}


export interface RequestMonitoring {
    /**
     * Request followers
     */
    channels$?: Subject<RequestEvent> | Array<Subject<RequestEvent>>,

    /**
     * request label used in the events emitted in events$
     */
    requestId?: string
}


export function resolveRequest<T = unknown>(request: Request, commandType: CommandType, options: RequestMonitoring): Observable<T> {

    let { requestId, channels$ } = options

    if (!channels$) {
        return createObservableFromFetch(request)
    }

    let follower = new RequestFollower({
        targetId: requestId,
        channels$,
        commandType
    })

    return of({}).pipe(
        tap(() => follower.start(1)),
        mergeMap(() => createObservableFromFetch(request)),
        tap(() => follower.end())
    ) as Observable<T>
}

export interface NativeRequestOptions extends RequestInit {

    json?: any
}

export function send$<T>(
    commandType: CommandType,
    path: string,
    nativeOptions?: NativeRequestOptions,
    monitoring?: RequestMonitoring
): Observable<T> {

    monitoring = monitoring || {}
    nativeOptions = nativeOptions || {}

    let { requestId, channels$ } = monitoring

    if (nativeOptions.json) {
        nativeOptions.body = JSON.stringify(nativeOptions.json)
        nativeOptions.headers = nativeOptions.headers
            ? { ...nativeOptions.headers, 'content-type': 'application/json' }
            : { 'content-type': 'application/json' }
    }
    let request = new Request(
        path,
        nativeOptions
    );

    if (!channels$) {
        return createObservableFromFetch(request)
    }

    let follower = new RequestFollower({
        targetId: requestId || path,
        channels$,
        commandType
    })

    return of({}).pipe(
        tap(() => follower.start(1)),
        mergeMap(() => createObservableFromFetch(request)),
        tap(() => follower.end())
    ) as Observable<T>
}



export function downloadBlob(
    url: string,
    fileId: string,
    headers: Object,
    options: RequestMonitoring,
    total?: number,
    useCache = true
): Observable<Blob> {

    let { requestId, channels$ } = options

    let follower = new RequestFollower({
        targetId: requestId || fileId,
        channels$,
        commandType: 'download'
    })

    let response$ = new ReplaySubject<Blob>(1)
    const xhr = new XMLHttpRequest()
    if (!useCache)
        url = url + '?_=' + new Date().getTime()

    xhr.open('GET', url)
    Object.entries(headers).forEach(([key, val]: [string, string]) => {
        xhr.setRequestHeader(key, val)
    })

    xhr.responseType = 'blob'

    xhr.onloadstart = (event) => follower.start(total || event.total)

    xhr.onprogress = (event) => follower.progressTo(event.loaded)

    xhr.onload = (e) => {
        follower.end()
        response$.next(xhr.response)
    }
    xhr.send()
    return response$
}

export function uploadBlob(
    url: string,
    fileName: string,
    blob: Blob,
    headers,
    options: RequestMonitoring,
    fileId?: string
): Observable<any | Error> {

    let { requestId, channels$ } = options

    let follower = new RequestFollower({
        targetId: fileId,
        channels$,
        commandType: 'upload'
    })

    let file = new File([blob], fileName, { type: blob.type })
    let formData = new FormData();
    formData.append("file", file);

    var xhr = new XMLHttpRequest();
    let response = new ReplaySubject<any>(1)

    xhr.open("POST", url, true);
    Object.entries(headers).forEach(([key, val]: [string, string]) => {
        xhr.setRequestHeader(key, val)
    })

    channels$ && (xhr.onloadstart = (event) => follower.start(event.total))

    channels$ && (xhr.upload.onprogress = (event) => follower.progressTo(event.loaded))

    xhr.onload = (event) => {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                channels$ && follower.end()
                response.next(JSON.parse(xhr.responseText))
            }
            else {
                response.next(new Error(xhr.statusText))
            }
        }
    };
    xhr.send(formData);
    return response.pipe(
        map(resp => {
            if (resp instanceof Error)
                throw resp
            return resp
        })
    )
}

