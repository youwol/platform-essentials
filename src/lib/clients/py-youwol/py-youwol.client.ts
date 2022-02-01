import { Observable } from 'rxjs'
import { RootRouter } from '../router'
import { RequestMonitoring } from '../utils'
import { HealthzResponse } from './interfaces'
import { AdminRouter } from './routers/admin.router'

export class PyYouwolClient extends RootRouter {
    public readonly admin: AdminRouter

    constructor({
        headers,
    }: {
        headers?: { [_key: string]: any }
    } = {}) {
        super({
            basePath: '',
            headers,
        })
        this.admin = new AdminRouter(this)
    }

    /**
     * Healthz of the service
     *
     * @param monitoring
     * @returns response
     */
    getHealthz(
        monitoring: RequestMonitoring = {},
    ): Observable<HealthzResponse> {
        return this.send$({
            command: 'query',
            path: `/healthz`,
            monitoring,
        })
    }
}
