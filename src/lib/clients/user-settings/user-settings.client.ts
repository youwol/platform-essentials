import { Observable } from 'rxjs';
import { RequestOptions, resolveRequest } from '../utils';



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

    /**
     * Healthz of the service, return "{status:'assets-gateway ok'}" if everything's fine
     * @param events$ optional request's followers
     * @returns response
     */
    querySettings(applicationId: string, options: RequestOptions = {}): Observable<unknown> {

        let request = new Request(
            `${this.basePath}/healthz`,
            { method: 'GET', headers: this.getHeaders(options.headers) }
        );
        return resolveRequest(request, 'query', { requestId: "healthz", ...options })
    }
}
