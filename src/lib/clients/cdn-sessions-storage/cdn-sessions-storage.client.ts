import { Observable } from 'rxjs';
import { RequestMonitoring } from '../utils';
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
}
