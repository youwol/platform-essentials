import { Observable, of, ReplaySubject } from 'rxjs';
import { Json, RequestOptions, resolveRequest } from '../utils';
import { cloneDeep, mergeWith } from 'lodash'


export class UserSettingsClient {

    static staticBasePath = "/api/user-settings"


    dynamicBasePath: string
    headers = {}

    constructor({
        basePath,
        headers
    }:
        {
            basePath?: string,
            headers?: { [key: string]: string }
        } = {}) {

        this.headers = headers || {}
        this.dynamicBasePath = basePath
    }

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

    /**
     * 
     * @param applicationId id of the application
     * @param defaultSettings default settings of the application
     * @param options request options
     * @returns response
     */
    querySettings<T>(applicationId: string, defaultSettings: T, options: RequestOptions = {}): Observable<T> {

        this.defaultSettings[applicationId] = defaultSettings as unknown as Json

        this.emitSettings(applicationId)
        return this.settings$[applicationId] as ReplaySubject<T>
    }

    /**
     * 
     * @param applicationId id of the application
     * @param defaultSettings default settings of the application
     * @param options request options
     * @returns response
     */
    updateSettings<T>(applicationId: string, settingsUpdate: T, options: RequestOptions = {}): Observable<T> {

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
    }
}
