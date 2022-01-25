import { Router } from '../../../router';
import { DataRouter } from './data/data.router';
import { FluxProjectRouter } from './flux-project/flux-project.router';
import { PackageRouter } from './package/package.router';


export class RawRouter extends Router {

    static dedicatedPathDomain = "raw"

    public readonly fluxProject: FluxProjectRouter
    public readonly package: PackageRouter
    public readonly data: DataRouter

    constructor(parent: Router) {
        super(parent.headers, `${parent.basePath}/raw`)

        this.fluxProject = new FluxProjectRouter(this)
        this.package = new PackageRouter(this)
        this.data = new DataRouter(this)
    }
}
