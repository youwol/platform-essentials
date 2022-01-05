import { Router } from '../../../router';
import { DataRouter } from './data/data.router';
import { FluxProjectRouter } from './flux-project/flux-project.router';
import { PackageRouter } from './package/package.router';


export class RawRouter extends Router {

    static dedicatedPathDomain = "raw"

    public readonly fluxProject: FluxProjectRouter
    public readonly package: PackageRouter
    public readonly data: DataRouter

    constructor({ rootPath, headers }: {
        rootPath: string,
        headers: { [key: string]: string }
    }) {
        super(headers, `${rootPath}/raw`)

        this.fluxProject = new FluxProjectRouter({ rootPath: this.basePath, headers: this.headers })
        this.package = new PackageRouter({ rootPath: this.basePath, headers: this.headers })
        this.data = new DataRouter({ rootPath: this.basePath, headers: this.headers })
    }
}
