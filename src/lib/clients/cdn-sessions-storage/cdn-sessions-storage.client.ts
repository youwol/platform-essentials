import {Observable} from 'rxjs';
import {RequestMonitoring} from '../utils';
import {RootRouter} from '../router';
import {HealthzResponse} from './interfaces';
import {ApplicationsRouter} from './routers';


export class CdnSessionsStorageClient extends RootRouter {

    applications: ApplicationsRouter

    constructor({headers}:
                    {
                        headers?: { [_key: string]: any }
                    } = {}) {
        super({
            basePath: "/api/cdn-sessions-storage",
            headers
        })

        this.applications = new ApplicationsRouter(this)
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
