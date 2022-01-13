import { Observable, of, ReplaySubject } from 'rxjs';
import { Json, RequestMonitoring, resolveRequest } from '../utils';
import { cloneDeep, mergeWith } from 'lodash'
import { Router } from '../router';
import { HealthzResponse } from './interfaces';
import { ApplicationsRouter } from './routers/applications';


export class CdnSessionsStorageClient extends Router {

    static staticBasePath = "/api/cdn-sessions-storage"

    applications: ApplicationsRouter

    constructor({ basePath, headers }:
        {
            basePath?: string,
            headers?: { [key: string]: string }
        } = {}) {
        super(headers, basePath || CdnSessionsStorageClient.staticBasePath)
        this.applications = new ApplicationsRouter({ headers, rootPath: this.basePath })
    }

    /**
     * Healthz of the service
     * 
     * @param monitoring 
     * @returns response
     */
    getHealthz(
        monitoring: RequestMonitoring = {}
    ): Observable<HealthzResponse> {

        return this.send$({
            command: 'query',
            path: `/healthz`,
            monitoring
        })
    }


    /*
    get basePath() {
        return this.dynamicBasePath || UserSettingsClient.staticBasePath
    }

    getHeaders(headers = {}) {
        return new Headers({ ...this.headers, ...headers })
    }

    static localStorageKey = "user-settings"

    static getData(): Json {

        if (!localStorage.getItem(UserSettingsClient.localStorageKey))
            localStorage.setItem(UserSettingsClient.localStorageKey, "{}")

        return JSON.parse(localStorage.getItem(UserSettingsClient.localStorageKey))
    }

    static saveData(d: Json) {
        localStorage.setItem(UserSettingsClient.localStorageKey, JSON.stringify(d))
    }

    settings$: { [key: string]: ReplaySubject<unknown> } = {}
    defaultSettings: { [key: string]: Json } = {}

    querySettings<T>(applicationId: string, defaultSettings: T, options: RequestMonitoring = {}): Observable<T> {

        this.defaultSettings[applicationId] = defaultSettings as unknown as Json

        this.emitSettings(applicationId)
        return this.settings$[applicationId] as ReplaySubject<T>
    }

    updateSettings<T>(applicationId: string, settingsUpdate: T, options: RequestMonitoring = {}): Observable<T> {

        let data = UserSettingsClient.getData()
        data[applicationId] = settingsUpdate
        UserSettingsClient.saveData(data)

        if (!this.defaultSettings[applicationId])
            return

        this.emitSettings(applicationId)
    }

    emitSettings(applicationId: string) {

        if (!this.settings$[applicationId])
            this.settings$[applicationId] = new ReplaySubject<Json>(1)

        let newAttributes = UserSettingsClient.getData()?.[applicationId]

        let merged = cloneDeep(this.defaultSettings[applicationId])
        mergeWith(merged, newAttributes)

        this.settings$[applicationId].next(merged)
    }*/
}
