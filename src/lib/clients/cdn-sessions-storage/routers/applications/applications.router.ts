import { Observable } from 'rxjs'
import { Router } from '../../../router'
import { Json, RequestMonitoring } from '../../../utils'

export class ApplicationsRouter extends Router {
    constructor(parent: Router) {
        super(parent.headers, `${parent.basePath}/applications`)
    }

    /**
     * Post data
     *
     * @param packageName name of the cdn package
     * @param dataName name of the data
     * @param monitoring
     * @returns response
     */
    postData(
        packageName: string,
        dataName: string,
        body: Json,
        monitoring: RequestMonitoring = {},
    ): Observable<{}> {
        return this.send$({
            command: 'upload',
            path: `/${packageName}/${dataName}`,
            requestOptions: {
                json: body,
            },
            monitoring,
        })
    }

    /**
     * Get data
     *
     * @param packageName name of the cdn package
     * @param dataName name of the data
     * @param monitoring
     * @returns response
     */
    getData(
        packageName: string,
        dataName: string,
        monitoring: RequestMonitoring = {},
    ): Observable<Json> {
        return this.send$({
            command: 'download',
            path: `/${packageName}/${dataName}`,
            monitoring,
        })
    }
}
