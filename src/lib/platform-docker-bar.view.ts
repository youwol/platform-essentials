import {attr$, child$, children$, VirtualDOM} from "@youwol/flux-view"
import {BehaviorSubject, combineLatest, Observable} from "rxjs"
import {Executable, PlatformSettingsStore, PlatformState, RunningApp} from "."


class DockerItemDetailsView implements VirtualDOM {

    public readonly state: PlatformState
    public readonly children: VirtualDOM[]
    public readonly executable: Executable
    public readonly instances: RunningApp[]
    public readonly class = 'd-flex flex-column justify-content-center p-1 w-100 rounded'
    public readonly style = {userSelect: 'none'}

    constructor(
        params: {
            state: PlatformState,
            executable: Executable,
            instances: RunningApp[]
        }
    ) {
        Object.assign(this, params)

        this.children = [
            this.instancesListView(),
            this.buttonNewInstance()
        ]
    }

    buttonNewInstance() {

        return {
            class: 'd-flex align-items-center border rounded fv-pointer fv-hover-xx-lighter p-1 fv-bg-secondary',
            children: [
                {
                    class: 'fas fa-plus fv-focus'
                },
                {
                    class: 'ml-1',
                    innerText: 'New'
                }
            ],
            onclick: () =>
                this.state.createInstance$({
                    cdnPackage: this.executable.cdnPackage,
                    version: this.executable.version,
                    focus: true
                }).subscribe()
        }
    }

    instancesListView() {

        return {
            class: 'w-100',
            children: this.instances.map((app) => {

                return {
                    class: 'fv-pointer px-1 my-1 border rounded fv-hover-bg-background-alt d-flex align-items-center justify-content-between',
                    onclick: () => this.state.focus(app.instanceId),
                    children: [
                        {
                            class: attr$(
                                this.state.runningApplication$,
                                (selected: RunningApp) => {

                                    return selected && selected.instanceId == app.instanceId
                                        ? 'fv-text-focus'
                                        : 'fv-text-primary'
                                },
                                {
                                    wrapper: (d) => `${d} px-1`
                                }
                            ),
                            children: [
                                child$(
                                    app.snippet$,
                                    (snippet) => snippet
                                )
                            ],
                        },
                        {
                            class: 'fv-text-error fv-hover-xx-lighter fas fa-times-circle',
                            onclick: (ev) => {
                                ev.stopPropagation()
                                this.state.close(app.instanceId)
                            },
                        }]
                }
            })
        }
    }
}


export class DockerItemView implements VirtualDOM {

    public readonly class = "d-flex flex-column align-items-center m-2 border rounded p-2 fv-bg-background"
    public readonly children: VirtualDOM[]
    public readonly executable: Executable
    public readonly style = {
        minWidth: '200px',
    }
    public readonly instances: RunningApp[]
    public readonly state: PlatformState

    constructor(
        params: {
            state: PlatformState,
            executable: Executable,
            instances: RunningApp[],
            expanded$: Observable<boolean>
        }) {

        Object.assign(this, params)
        this.children = [
            this.headerView(),
            new DockerItemDetailsView({ state: this.state, instances: this.instances, executable: this.executable })
        ]
    }

    headerView() {
        return {
            class: attr$(
                this.state.runningApplication$,
                (runningApp) => runningApp && runningApp.cdnPackage == this.executable.cdnPackage
                    ? 'fv-text-focus'
                    : 'fv-text-primary',
                { wrapper: (d) => `${d} d-flex align-items-center`, }),
            children: [
                child$(
                    this.executable.appMetadata$,
                    (d) => d.icon),
                {
                    tag: 'span',
                    class: 'mx-2',
                    innerText: attr$(
                        this.executable.appMetadata$,
                        (d) => d.name
                    )
                }
            ]
        }
    }
}


export class AppsDockerView implements VirtualDOM {

    public readonly class = 'apps-docker-view border rounded d-flex flex-wrap p-1 fv-bg-primary'
    public readonly style = {
        maxWidth: '100%'
    }

    public readonly children: any

    public readonly state: PlatformState
    public readonly onmouseenter: any
    public readonly onmouseleave: any

    constructor(params: { state: PlatformState }) {
        Object.assign(this, params)

        let expanded$ = new BehaviorSubject(false)

        this.children = children$(
            combineLatest([
                this.state.runningApplications$,
                PlatformSettingsStore.getDockerBarApps$()
            ]),
            ([runningApps, dockerBarApps]: [RunningApp[], Executable[]]) => {

                let executables: { [key: string]: Executable } = [...runningApps, ...dockerBarApps]
                    .reduce((acc, e) => ({ ...acc, [e.cdnPackage]: e }), {})

                return Object.values(executables).map((executable: Executable) => new DockerItemView({
                    executable,
                    instances: runningApps.filter((app) => app.cdnPackage == executable.cdnPackage),
                    expanded$,
                    state: this.state
                }))
            }
        )
        this.onmouseenter = () => expanded$.next(true)
        this.onmouseleave = () => expanded$.next(false)
    }
}
