import { child$, VirtualDOM } from '@youwol/flux-view'
import { Button } from '@youwol/fv-button'
import { BehaviorSubject, combineLatest, from, Observable, of, ReplaySubject, Subject } from 'rxjs'
import {
    concatMap, distinctUntilChanged, filter, map, mergeMap,
    scan, share, takeUntil, tap
} from 'rxjs/operators'
import { Asset, AssetsGatewayClient } from '../../../assets-gateway-client'



export function getActions(asset: Asset) {
    let classes = 'fv-btn fv-btn-secondary mx-1 '

    let runBttnState = new Button.State()
    let runBttn = new Button.View({
        state: runBttnState, class: classes,
        contentView: () => ({ innerText: 'run' })
    } as any)
    runBttnState.click$.subscribe(() => window.location.href = `/ui/flux-runner/?id=${asset.rawId}`)

    let constructBttnState = new Button.State()
    let constructBttn = new Button.View({
        state: constructBttnState, class: classes,
        contentView: () => ({ innerText: 'construct' })
    } as any)
    constructBttnState.click$.subscribe(() => window.location.href = `/ui/flux-builder/?id=${asset.rawId}`)

    let editBttnState = new Button.State()
    let editBttn = new Button.View({
        state: editBttnState, class: classes,
        contentView: () => ({ innerText: 'edit' })
    } as any)
    editBttnState.click$.subscribe(() => window.location.href = `/ui/assets-publish-ui?kind=flux-project&related_id=${asset.rawId}`)

    return {
        class: "w-100 d-flex flex-wrap",
        children: [
            runBttn,
            constructBttn,
            editBttn
            //clone: cloneBttn.data,
            //delete:deleteBttn.data
        ]
    }
}

class LoadingGraph {

    type: string
    lock: Array<{ id: string, name: string, version: string }>
    definition: Array<Array<string | [string, string]>>

}

class Requirements {

    fluxPacks: Array<string>
    libraries: { [key: string]: string }
    loadingGraph: LoadingGraph
}
class Lib {
    id: string
    name: string
    version: string
}
export class FluxDependenciesState {

    accessInfo$ = new AssetsGatewayClient().accessInfo$(this.asset.assetId).pipe(share())

    userPicks = {}
    libsVersionsCache = {}

    requirements$ = new ReplaySubject<Requirements>()
    selectedPacks$ = new BehaviorSubject([])
    selectedComponents$ = new BehaviorSubject([])

    // dependencies$ : the dependencies of the project (included explicit update): { $libName : $selectedVersion }
    // selectedVersion is : latest picked by the user || latest available 
    dependencies$ = new BehaviorSubject<{ [key: string]: Lib }>({})

    //  versions$: Versions of the libs available for each dependencies
    versions$ = new BehaviorSubject({})

    // selectedVersion$: the initial 'latest' version of each dependencies, then also the user picks
    selectedVersion$ = new ReplaySubject(1)

    // selectedVersionAcc$: accumulation of this.selectedVersion$ 
    selectedVersionAcc$ = new BehaviorSubject({})

    // versionsState$: this.selectedVersionAcc$ with keys filtered on actual dependencies
    // e.g. the user may have unselect a package => dependencies updated 
    versionsState$ = new BehaviorSubject({})

    state$: Observable<{ fluxPacks: Array<any>, libraries: { [key: string]: Lib } }>

    currentState: { fluxPacks: Array<any>, libraries: { [key: string]: Lib } }

    // next is called by the UI part
    unsubscribe$ = new Subject()

    assetsGtwClient = new AssetsGatewayClient()

    constructor(public readonly asset: Asset) {

        this.userPicks = {}
        this.libsVersionsCache = {}

        this.assetsGtwClient.getFluxProject$(asset.rawId)
            .subscribe((project) => {
                this.requirements$.next(project.requirements)
                this.selectedPacks$.next(project.requirements.fluxPacks)
                this.selectedComponents$.next(project.requirements.fluxComponents)
            })

        //  versions$: Versions of the libs available for each dependencies
        let getLibVersions = (lib) => {
            if (lib.id) {
                return this.libsVersionsCache[lib.id]
                    ? of(this.libsVersionsCache[lib.id])
                    : this.assetsGtwClient.getPackageMetadata$(lib.id).pipe(
                        tap(library => this.libsVersionsCache[lib.id] = library)
                    )

            }

            return this.libsVersionsCache[lib.name]
                ? of(this.libsVersionsCache[lib.name])
                : getLibVersions(lib.name)
                    .pipe(tap(library => this.libsVersionsCache[lib.name] = library))
        }

        /**
         * An idea of improvement: at construction only fetch the latest version of lib
         * (to display 'update available' if any).
         * Then when the user click to select another version => the fetch the available versions of the particular lib
         */
        this.dependencies$.pipe(
            mergeMap((dependencies) =>
                from(Object.values(dependencies)).pipe(
                    concatMap((lib) => getLibVersions(lib))
                    // next option is to run all requests in parallel, but it was causing docdb to display wrong results
                    // mergeMap((lib) => getLibVersions(lib))
                ))).subscribe((resp: any) => {
                    let newVersions = Object.assign({}, this.versions$.getValue(), { [resp.name]: resp.versions })
                    this.versions$.next(newVersions)
                })

        this.dependencies$.pipe(
            takeUntil(this.unsubscribe$),
            mergeMap((dependencies) => from(Object.entries(dependencies)))
        ).subscribe(([name, { version }]) => {
            this.selectedVersion$.next([name, version])
        })

        this.selectedVersion$.pipe(
            takeUntil(this.unsubscribe$),
            scan((acc, [name, version]) => {
                if (name == undefined)
                    return Object.assign({}, acc)

                return Object.assign({}, acc, { [name]: version })
            }, {}),
            distinctUntilChanged((s0, s1) =>
                Object.keys(s1).map(k => [k, s0[k] == s1[k]]).filter(v => !v[1]).length === 0 &&
                Object.keys(s0).map(k => [k, s0[k] == s1[k]]).filter(v => !v[1]).length === 0
            )
        ).subscribe(d => {
            this.selectedVersionAcc$.next(d)

        })

        combineLatest([this.dependencies$, this.selectedVersionAcc$]).pipe(
            takeUntil(this.unsubscribe$),
            map(([dependencies, versionAcc]) => {
                return Object.keys(dependencies).reduce((acc, e) => Object.assign({}, acc, { [e]: versionAcc[e] }), {})
            })
        ).subscribe((d) => this.versionsState$.next(d))


        this.state$ = combineLatest([this.dependencies$, this.selectedPacks$])
            .pipe(
                takeUntil(this.unsubscribe$),
                map(([deps, packs]: [{ [key: string]: Lib }, Array<any>]) => ({
                    fluxPacks: Object.entries(packs).filter(([id, included]) => included && id != "flux-pack-core").map(([p, _]) => p),
                    libraries: deps
                })
                )
            )
        this.state$.subscribe(state => this.currentState = state)
        this.requirements$.pipe(
            takeUntil(this.unsubscribe$),
        ).subscribe(req => {

            let dependencies = req.loadingGraph.lock
                ? req.loadingGraph.lock.reduce((acc, e) => Object.assign({}, acc, { [e.name]: e }), {})
                : Object.entries(req.libraries).map(([k, v]) => ({ name: k, id: undefined, version: v }))
                    .reduce((acc, e) => Object.assign({}, acc, { [e.name]: e }), {})

            this.dependencies$.next(dependencies)
        })
    }

    disconnect() {
        this.unsubscribe$.next()
        this.unsubscribe$.complete()
    }
    togglePacks(packs) {

        let selecteds = this.selectedPacks$.getValue()
        packs.forEach(pack => selecteds[pack.name] = !selecteds[pack.name])
        this.selectedPacks$.next(selecteds)
        this.refreshDependencies()
    }

    selectVersion(library, version) {
        this.selectedVersion$.next([library, version])
    }

    setDependency(library, version) {

        this.userPicks[library] = version
        let currentVersions = this.dependencies$.getValue()
        if (typeof currentVersions[library] == "object")
            currentVersions[library].version = version
        else
            currentVersions[library] = version

        //this.dependencies$.next(news)
        this.refreshDependencies(currentVersions)
    }

    refreshDependencies(fromVersions = undefined) {
        fromVersions = fromVersions || this.dependencies$.getValue()
        let librariesVersion = Object.entries(fromVersions)
            .reduce((acc, [k, v]: [string, any]) => Object.assign({}, acc, { [k]: typeof (v) == "object" ? v.version : v }), {})

        let body = {
            fluxPacks: this.selectedPacks$.getValue(),
            fluxComponents: this.selectedComponents$.getValue(),
            libraries: librariesVersion
        }

        this.assetsGtwClient.updateFluxProjectMetadata$(this.asset.rawId, body).pipe(
            mergeMap(() => this.assetsGtwClient.getFluxProject$(this.asset.rawId))
        )
            .subscribe((project) => {
                this.requirements$.next(project.requirements)
                this.selectedPacks$.next(project.requirements.fluxPacks)
                this.selectedComponents$.next(project.requirements.fluxComponents)
            })
    }

    isLatestVersion(versions, library) {
        if (versions[library] == undefined)
            return false

        return this.dependencies$.getValue()[library].version == versions[library][0]
    }
    isCurrentVersion(library, version) {
        return this.dependencies$.getValue()[library].version == version
    }
}


export class FluxDependenciesView implements VirtualDOM {

    public readonly versionAvailableSelect$ = new ReplaySubject(1)
    public readonly output$
    public readonly subscriptions = []
    public readonly class = ' m-auto h-100 d-flex flex-column'
    public readonly onclick = (event) => event.stopPropagation()
    public readonly children: Array<VirtualDOM>

    public readonly asset: Asset
    public readonly state: FluxDependenciesState
    public readonly dataProject$ = new Subject()

    constructor(params: { asset: Asset }) {

        Object.assign(this, params)
        this.state = new FluxDependenciesState(this.asset)
        this.state.versions$.subscribe(d => {
            this.versionAvailableSelect$.next(d)
        })

        this.children = [
            {
                class: 'w-100 text-center  py-3 fv-text-primary', style: { "font-size": "large", "font-family": "fantasy" },
                innerText: 'Dependencies of the project'
            },
            {
                class: 'py-2 h-100 overflow-auto flex-grow-1 px-4  d-flex justify-content-center',
                children: [
                    child$(
                        this.state.accessInfo$,
                        (info: any) => info.consumerInfo.permissions.write
                            ? this.panelDependenciesReadWWrite(this.state)
                            : this.panelDependenciesReadOnly(this.state)

                    )
                ]
            }
        ]
    }


    panelDependenciesReadWWrite(state) {

        let versionAvailableSelect = (lib) =>
            child$(
                this.versionAvailableSelect$.pipe(
                    filter(versions => versions[lib]),
                    tap(versions => {
                        state.selectVersion(lib, versions[lib][0])
                    })),
                versions => ({
                    class: 'form-group col-sm my-auto',
                    children: [
                        {
                            tag: 'select', class: 'form-control', id: lib,
                            onchange: (d) => state.selectVersion(lib, d.target.value),
                            children: versions[lib].map(version =>
                                ({ tag: "option", value: version, class: "px-2", innerText: version }))
                        }
                    ]
                }))

        let updateBtn$ = (lib, _version) =>
            child$(state.versionsState$,
                (versions) => {
                    if (state.isCurrentVersion(lib, versions[lib]))
                        return {}
                    let bttnState = new Button.State()
                    this.subscriptions.push(
                        bttnState.click$.subscribe(() => state.setDependency(lib, versions[lib]))
                    )

                    return new Button.View({
                        state: bttnState,
                        contentView: () => ({ innerText: 'Update' }),
                        class: "fv-text-focus fv-bg-background "
                    } as any)
                })

        let tableHeaders = ["name", 'version', '', 'versions available', '']
        let upgrade$ = (name) =>
            child$(
                state.versions$,
                (versions) => {
                    return state.isLatestVersion(versions, name) ?
                        { tag: 'label', innerText: '', class: 'col-sm' } :
                        { tag: 'label', innerText: 'upgrade available', class: "col-sm color-primary" }
                })

        let rows$ = state.dependencies$.pipe(
            map(dependencies => {
                return Object.entries(dependencies).map(([name, lib]) =>
                    [{ tag: 'label', class: 'col-sm', innerText: name.includes('/') ? name.split('/')[1] : name },
                    { tag: 'label', class: 'col-sm', innerText: lib.version },
                    upgrade$(name),
                    versionAvailableSelect(name),
                    updateBtn$(name, lib.version)])
            }))
        let sorters = [
            (row0, row1) => row0[0].innerText.localeCompare(row1[0].innerText)
        ]

        return {
            children: [createTable(tableHeaders, rows$, sorters)]
        }
    }

    panelDependenciesReadOnly(state) {

        let tableHeaders = ["name", 'version']
        let rows$ = state.dependencies$.pipe(
            map(dependencies => {
                return Object.entries(dependencies).map(([name, lib]) =>
                    [
                        { tag: 'label', class: 'col-sm', innerText: name.includes('/') ? name.split('/')[1] : name },
                        { tag: 'label', class: 'col-sm', innerText: lib.version }
                    ]
                )
            })
        )
        let sorters = [
            (row0, row1) => row0[0].innerText.localeCompare(row1[0].innerText)
        ]
        return {
            children: [createTable(tableHeaders, rows$, sorters)]
        }
    }

}


function createTable(headers, rows$, sorters) {

    function sort(rows) {
        return rows.sort((k, v) => {
            return sorters[0](k, v)
        })
    }

    return child$(
        rows$,
        rows => {
            return {
                tag: "table",
                class: "pl-4 fv-text-primary",
                children: [
                    {
                        tag: 'tr',
                        children: headers.map(header => ({
                            tag: 'th',
                            scope: "col",
                            children: [{
                                tag: 'label', class: "col-sm",
                                innerText: header
                            }]
                        }))
                    }
                    , ...sort(rows).map((cells) => (
                        {
                            tag: "tr", class: 'text-left', style: { height: "50px" },
                            children: cells.map(cell => ({
                                tag: 'th',
                                class: "font-weight-light",
                                children: [cell]
                            }))
                        }))
                ]
            }
        })
}

