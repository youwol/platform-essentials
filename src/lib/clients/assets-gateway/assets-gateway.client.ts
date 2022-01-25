import { Observable } from 'rxjs';
import { GroupsResponse, HealthzResponse, UserInfoResponse } from './interfaces';
import { RequestMonitoring } from '../utils';
import { ExplorerRouter } from './routers/explorer/explorer.router'
import { AssetsRouter } from './routers/assets/assets.router';
import { RawRouter } from './routers/raw/raw.router';
import { Router } from '../router';


export class AssetsGatewayClient extends Router {

    static staticBasePath = "/api/assets-gateway"
    static staticHeaders = {}
    public readonly explorer: ExplorerRouter
    public readonly assets: AssetsRouter
    public readonly raw: RawRouter

    constructor({ basePath, headers }:
        {
            basePath?: string,
            headers?: { [key: string]: any }
        } = {}) {
        super(
            { ...headers, ...AssetsGatewayClient.staticHeaders },
            basePath || AssetsGatewayClient.staticBasePath
        )

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
        monitoring: RequestMonitoring = {}
    ): Observable<HealthzResponse> {

        return this.send$({
            command: 'query',
            path: `/healthz`,
            monitoring
        })
    }

    /**
     * User infos
     * 
     * @param monitoring 
     * @returns response
     */
    getUserInfo(
        monitoring: RequestMonitoring = {}
    ): Observable<UserInfoResponse> {

        return this.send$({
            command: 'query',
            path: `/user-info`,
            monitoring
        })
    }

    /**
     * Groups in which the user belong
     * @param options options of the request
     * @returns response
     */
    queryGroups(
        monitoring: RequestMonitoring = {}
    ): Observable<GroupsResponse> {

        return this.send$({
            command: 'query',
            path: `/groups`,
            monitoring
        })
    }

}
