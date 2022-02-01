import { Observable } from 'rxjs'
import { RootRouter } from '../router'
import { RequestMonitoring } from '../utils'
import { GroupsResponse, HealthzResponse, UserInfoResponse } from './interfaces'
import { AssetsRouter, ExplorerRouter, RawRouter } from './routers'

export class AssetsGatewayClient extends RootRouter {
    public readonly explorer: ExplorerRouter
    public readonly assets: AssetsRouter
    public readonly raw: RawRouter

    constructor({
        headers,
    }: {
        headers?: { [_key: string]: string }
    } = {}) {
        super({
            basePath: '/api/assets-gateway',
            headers,
        })
        this.explorer = new ExplorerRouter(this)
        this.assets = new AssetsRouter(this)
        this.raw = new RawRouter(this)
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

    /**
     * User infos
     *
     * @param monitoring
     * @returns response
     */
    getUserInfo(
        monitoring: RequestMonitoring = {},
    ): Observable<UserInfoResponse> {
        return this.send$({
            command: 'query',
            path: `/user-info`,
            monitoring,
        })
    }

    /**
     * Groups in which the user belong
     * @param monitoring
     * @returns response
     */
    queryGroups(
        monitoring: RequestMonitoring = {},
    ): Observable<GroupsResponse> {
        return this.send$({
            command: 'query',
            path: `/groups`,
            monitoring,
        })
    }
}
