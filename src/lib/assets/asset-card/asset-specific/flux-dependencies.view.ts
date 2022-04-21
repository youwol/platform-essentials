import { child$, VirtualDOM } from '@youwol/flux-view'
import { Button } from '@youwol/fv-button'
import {
    AssetsGateway,
    dispatchHTTPErrors,
    HTTPError,
    raiseHTTPErrors,
} from '@youwol/http-clients'
import {
    BehaviorSubject,
    combineLatest,
    from,
    Observable,
    of,
    ReplaySubject,
    Subject,
} from 'rxjs'
import {
    concatMap,
    distinctUntilChanged,
    filter,
    map,
    mergeMap,
    scan,
    share,
    takeUntil,
    tap,
} from 'rxjs/operators'

export function getActions(asset: AssetsGateway.Asset) {
    const classes = 'fv-btn fv-btn-secondary mx-1 '

    const runButtonState = new Button.State()
    const runButton = new Button.View({
        state: runButtonState,
        class: classes,
        contentView: () => ({ innerText: 'run' }),
    })
    runButtonState.click$.subscribe(
        () =>
            (window.location.href = `/applications/@youwol/flux-runner/?id=${asset.rawId}`),
    )

    const constructButtonState = new Button.State()
    const constructButton = new Button.View({
        state: constructButtonState,
        class: classes,
        contentView: () => ({ innerText: 'construct' }),
    })
    constructButtonState.click$.subscribe(
        () =>
            (window.location.href = `/applications/@youwol/flux-builder/?id=${asset.rawId}`),
    )

    const editButtonState = new Button.State()
    const editButton = new Button.View({
        state: editButtonState,
        class: classes,
        contentView: () => ({ innerText: 'edit' }),
    })
    editButtonState.click$.subscribe(
        () =>
            (window.location.href = `/applications/@youwol/assets-publish-ui?kind=flux-project&related_id=${asset.rawId}`),
    )

    return {
        class: 'w-100 d-flex flex-wrap',
        children: [runButton, constructButton, editButton],
    }
}

class Lib {
    id: string
    name: string
    version: string
}

export class FluxDependenciesState {
    error$ = new Subject<HTTPError>()
    accessInfo$ = new AssetsGateway.AssetsGatewayClient().assetsDeprecated
        .getAccess$(this.asset.assetId)
        .pipe(raiseHTTPErrors(), share())

    userPicks = {}
    libsVersionsCache = {}

    requirements$ = new ReplaySubject<AssetsGateway.Requirements>()
    selectedPacks$ = new BehaviorSubject([])

    // dependencies$ : the dependencies of the project (included explicit update): { $libName : $selectedVersion }
    // selectedVersion is : latest picked by the user or latest available
    dependencies$ = new BehaviorSubject<{ [key: string]: Lib }>({})

    //  versions$: Versions of the libs available for each dependency
    versions$ = new BehaviorSubject({})

    // selectedVersion$: the initial 'latest' version of each dependency, then also the user picks
    selectedVersion$ = new ReplaySubject(1)

    // selectedVersionAcc$: accumulation of this.selectedVersion$
    selectedVersionAcc$ = new BehaviorSubject({})

    // versionsState$: this.selectedVersionAcc$ with keys filtered on actual dependencies
    // e.g. the user may have unselected a package => dependencies updated
    versionsState$ = new BehaviorSubject({})

    state$: Observable<{
        fluxPacks: string[]
        libraries: { [key: string]: Lib }
    }>

    currentState: { fluxPacks: string[]; libraries: { [key: string]: Lib } }

    // next is called by the UI part
    unsubscribe$ = new Subject()

    assetsGtwClient = new AssetsGateway.AssetsGatewayClient()

    constructor(public readonly asset: AssetsGateway.Asset) {
        this.userPicks = {}
        this.libsVersionsCache = {}

        this.assetsGtwClient.rawDeprecated.fluxProject
            .getProject$(asset.rawId)
            .pipe(dispatchHTTPErrors(this.error$))
            .subscribe((project) => {
                this.requirements$.next(project.requirements)
                this.selectedPacks$.next(project.requirements.fluxPacks)
                //this.selectedComponents$.next(project.requirements.fluxComponents)
            })

        //  versions$: Versions of the libs available for each dependency
        const getLibVersions = (lib) => {
            if (lib.id) {
                return this.libsVersionsCache[lib.id]
                    ? of(this.libsVersionsCache[lib.id])
                    : this.assetsGtwClient.rawDeprecated.package
                          .getMetadata$(lib.id)
                          .pipe(
                              tap(
                                  (library) =>
                                      (this.libsVersionsCache[lib.id] =
                                          library),
                              ),
                          )
            }

            return this.libsVersionsCache[lib.name]
                ? of(this.libsVersionsCache[lib.name])
                : getLibVersions(lib.name).pipe(
                      tap(
                          (library) =>
                              (this.libsVersionsCache[lib.name] = library),
                      ),
                  )
        }

        /**
         * An idea of improvement: at construction only fetch the latest version of lib
         * (to display 'update available' if any).
         * Then when the user click to select another version => the fetch the available versions of the particular lib
         */
        this.dependencies$
            .pipe(
                mergeMap((dependencies) =>
                    from(Object.values(dependencies)).pipe(
                        concatMap((lib) => getLibVersions(lib)),
                        // next option is to run all requests in parallel, but it was causing docdb to display wrong results
                        // mergeMap((lib) => getLibVersions(lib))
                    ),
                ),
            )
            .subscribe((resp: { name: string; versions: string[] }) => {
                const newVersions = Object.assign(
                    {},
                    this.versions$.getValue(),
                    { [resp.name]: resp.versions },
                )
                this.versions$.next(newVersions)
            })

        this.dependencies$
            .pipe(
                takeUntil(this.unsubscribe$),
                mergeMap((dependencies) => from(Object.entries(dependencies))),
            )
            .subscribe(([name, { version }]) => {
                this.selectedVersion$.next([name, version])
            })

        this.selectedVersion$
            .pipe(
                takeUntil(this.unsubscribe$),
                scan((acc, [name, version]) => {
                    if (name == undefined) {
                        return Object.assign({}, acc)
                    }

                    return Object.assign({}, acc, { [name]: version })
                }, {}),
                distinctUntilChanged(
                    (s0, s1) =>
                        Object.keys(s1)
                            .map((k) => [k, s0[k] == s1[k]])
                            .filter((v) => !v[1]).length === 0 &&
                        Object.keys(s0)
                            .map((k) => [k, s0[k] == s1[k]])
                            .filter((v) => !v[1]).length === 0,
                ),
            )
            .subscribe((d) => {
                this.selectedVersionAcc$.next(d)
            })

        combineLatest([this.dependencies$, this.selectedVersionAcc$])
            .pipe(
                takeUntil(this.unsubscribe$),
                map(([dependencies, versionAcc]) => {
                    return Object.keys(dependencies).reduce(
                        (acc, e) =>
                            Object.assign({}, acc, { [e]: versionAcc[e] }),
                        {},
                    )
                }),
            )
            .subscribe((d) => this.versionsState$.next(d))

        this.state$ = combineLatest([
            this.dependencies$,
            this.selectedPacks$,
        ]).pipe(
            takeUntil(this.unsubscribe$),
            map(
                ([deps, packs]: [
                    { [_key: string]: Lib },
                    Array<{ [_k: string]: boolean }>,
                ]) => ({
                    fluxPacks: Object.entries(packs)
                        .filter(
                            ([id, included]) =>
                                included && id != 'flux-pack-core',
                        )
                        .map(([p, _]) => p),
                    libraries: deps,
                }),
            ),
        )
        this.state$.subscribe((state) => (this.currentState = state))
        this.requirements$
            .pipe(takeUntil(this.unsubscribe$))
            .subscribe((req) => {
                const dependencies = req.loadingGraph.lock
                    ? req.loadingGraph.lock.reduce(
                          (acc, e) => Object.assign({}, acc, { [e.name]: e }),
                          {},
                      )
                    : Object.entries(req.libraries)
                          .map(([k, v]) => ({
                              name: k,
                              id: undefined,
                              version: v,
                          }))
                          .reduce(
                              (acc, e) =>
                                  Object.assign({}, acc, { [e.name]: e }),
                              {},
                          )

                this.dependencies$.next(dependencies)
            })
    }

    selectVersion(library, version) {
        this.selectedVersion$.next([library, version])
    }

    setDependency(library, version) {
        this.userPicks[library] = version
        const currentVersions = this.dependencies$.getValue()
        if (typeof currentVersions[library] == 'object') {
            currentVersions[library].version = version
        } else {
            currentVersions[library] = version
        }

        //this.dependencies$.next(news)
        this.refreshDependencies(currentVersions)
    }

    refreshDependencies(fromVersions = undefined) {
        fromVersions = fromVersions || this.dependencies$.getValue()
        const librariesVersion: { [k: string]: string } = Object.entries(
            fromVersions,
        ).reduce(
            (acc, [k, v]: [string, { version: string }]) =>
                Object.assign({}, acc, {
                    [k]: typeof v == 'object' ? v.version : v,
                }),
            {},
        )

        const body = {
            libraries: librariesVersion,
        }

        this.assetsGtwClient.rawDeprecated.fluxProject
            .updateMetadata$(this.asset.rawId, body)
            .pipe(
                dispatchHTTPErrors(this.error$),
                mergeMap(() =>
                    this.assetsGtwClient.rawDeprecated.fluxProject
                        .getProject$(this.asset.rawId)
                        .pipe(dispatchHTTPErrors(this.error$)),
                ),
            )
            .subscribe((project) => {
                this.requirements$.next(project.requirements)
                this.selectedPacks$.next(project.requirements.fluxPacks)
                //this.selectedComponents$.next(project.requirements.fluxComponents)
            })
    }

    isLatestVersion(versions, library) {
        if (versions[library] == undefined) {
            return false
        }

        return (
            this.dependencies$.getValue()[library].version ==
            versions[library][0]
        )
    }
    isCurrentVersion(library, version) {
        return this.dependencies$.getValue()[library].version == version
    }
}

export class FluxDependenciesView implements VirtualDOM {
    public readonly versionAvailableSelect$ = new ReplaySubject(1)
    public readonly subscriptions = []
    public readonly class = ' m-auto h-100 d-flex flex-column'
    public readonly onclick = (event) => event.stopPropagation()
    public readonly children: Array<VirtualDOM>

    public readonly asset: AssetsGateway.Asset
    public readonly state: FluxDependenciesState

    constructor(params: { asset: AssetsGateway.Asset }) {
        Object.assign(this, params)
        this.state = new FluxDependenciesState(this.asset)
        this.state.versions$.subscribe((d) => {
            this.versionAvailableSelect$.next(d)
        })

        this.children = [
            {
                class: 'w-100 text-center  py-3 fv-text-primary',
                style: { 'font-size': 'large', 'font-family': 'fantasy' },
                innerText: 'Dependencies of the project',
            },
            {
                class: 'py-2 h-100 overflow-auto flex-grow-1 px-4  d-flex justify-content-center',
                children: [
                    child$(this.state.accessInfo$, (info) =>
                        info.consumerInfo.permissions.write
                            ? this.panelDependenciesReadWWrite(this.state)
                            : this.panelDependenciesReadOnly(this.state),
                    ),
                ],
            },
        ]
    }

    panelDependenciesReadWWrite(state) {
        const versionAvailableSelect = (lib) =>
            child$(
                this.versionAvailableSelect$.pipe(
                    filter((versions) => versions[lib]),
                    tap((versions) => {
                        state.selectVersion(lib, versions[lib][0])
                    }),
                ),
                (versions) => ({
                    class: 'form-group col-sm my-auto',
                    children: [
                        {
                            tag: 'select',
                            class: 'form-control',
                            id: lib,
                            onchange: (d) =>
                                state.selectVersion(lib, d.target.value),
                            children: versions[lib].map((version) => ({
                                tag: 'option',
                                value: version,
                                class: 'px-2',
                                innerText: version,
                            })),
                        },
                    ],
                }),
            )

        const updateBtn$ = (lib, _version) =>
            child$(state.versionsState$, (versions) => {
                if (state.isCurrentVersion(lib, versions[lib])) {
                    return {}
                }
                const buttonState = new Button.State()
                this.subscriptions.push(
                    buttonState.click$.subscribe(() =>
                        state.setDependency(lib, versions[lib]),
                    ),
                )

                return new Button.View({
                    state: buttonState,
                    contentView: () => ({ innerText: 'Update' }),
                    class: 'fv-text-focus fv-bg-background ',
                })
            })

        const tableHeaders = ['name', 'version', '', 'versions available', '']
        const upgrade$ = (name) =>
            child$(state.versions$, (versions) => {
                return state.isLatestVersion(versions, name)
                    ? { tag: 'label', innerText: '', class: 'col-sm' }
                    : {
                          tag: 'label',
                          innerText: 'upgrade available',
                          class: 'col-sm color-primary',
                      }
            })

        const rows$ = state.dependencies$.pipe(
            map((dependencies) => {
                return Object.entries(dependencies).map(([name, lib]) => [
                    {
                        tag: 'label',
                        class: 'col-sm',
                        innerText: name.includes('/')
                            ? name.split('/')[1]
                            : name,
                    },
                    { tag: 'label', class: 'col-sm', innerText: lib.version },
                    upgrade$(name),
                    versionAvailableSelect(name),
                    updateBtn$(name, lib.version),
                ])
            }),
        )
        const sorters = [
            (row0, row1) => row0[0].innerText.localeCompare(row1[0].innerText),
        ]

        return {
            children: [createTable(tableHeaders, rows$, sorters)],
        }
    }

    panelDependenciesReadOnly(state) {
        const tableHeaders = ['name', 'version']
        const rows$ = state.dependencies$.pipe(
            map((dependencies) => {
                return Object.entries(dependencies).map(([name, lib]) => [
                    {
                        tag: 'label',
                        class: 'col-sm',
                        innerText: name.includes('/')
                            ? name.split('/')[1]
                            : name,
                    },
                    { tag: 'label', class: 'col-sm', innerText: lib.version },
                ])
            }),
        )
        const sorters = [
            (row0, row1) => row0[0].innerText.localeCompare(row1[0].innerText),
        ]
        return {
            children: [createTable(tableHeaders, rows$, sorters)],
        }
    }
}

function createTable(headers, rows$, sorters) {
    function sort(rows) {
        return rows.sort((k, v) => {
            return sorters[0](k, v)
        })
    }

    return child$(rows$, (rows) => {
        return {
            tag: 'table',
            class: 'pl-4 fv-text-primary',
            children: [
                {
                    tag: 'tr',
                    children: headers.map((header) => ({
                        tag: 'th',
                        scope: 'col',
                        children: [
                            {
                                tag: 'label',
                                class: 'col-sm',
                                innerText: header,
                            },
                        ],
                    })),
                },
                ...sort(rows).map((cells) => ({
                    tag: 'tr',
                    class: 'text-left',
                    style: { height: '50px' },
                    children: cells.map((cell) => ({
                        tag: 'th',
                        class: 'font-weight-light',
                        children: [cell],
                    })),
                })),
            ],
        }
    })
}
