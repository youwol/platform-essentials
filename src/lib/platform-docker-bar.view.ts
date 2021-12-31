import { attr$, child$, children$, VirtualDOM } from "@youwol/flux-view"
import { BehaviorSubject, combineLatest, Observable } from "rxjs"
import { Executable, PlatformSettingsStore, PlatformState, RunningApp } from "."


class DockerItemIconView implements VirtualDOM {

    public readonly state: PlatformState
    public readonly children: VirtualDOM[]
    public readonly executable: Executable
    public readonly instances: RunningApp[]
    public readonly onclick: (ev: MouseEvent) => void
    public readonly class: any
    public readonly style = {
        position: 'relative',
        width: 'fit-content',
        minWidth: '50px'
    }

    constructor(
        params: {
            state: PlatformState,
            executable: Executable,
            instances: RunningApp[]
        }
    ) {
        Object.assign(this, params)
        let baseClasses = "fv-pointer my-auto border rounded p-2 fv-bg-background fv-hover-text-primary fv-hover-bg-secondary d-relative"
        let radius = 6
        this.class = attr$(
            this.state.runningApplication$,
            (app: RunningApp) => {

                return app && app.cdnPackage == this.executable.cdnPackage
                    ? 'fv-text-focus'
                    : 'fv-text-primary'
            },
            {
                wrapper: (d) => `${baseClasses} ${d}`
            }
        )
        this.onclick = () => {
            this.state.createInstance$({ cdnPackage: this.executable.cdnPackage, focus: true }).subscribe()
        }
        this.children = [
            this.executable.icon,
            {
                class: 'd-flex justify-content-around w-100',
                style: {
                    position: 'absolute',
                    top: `-${Math.floor(radius / 2)}px`,
                    left: `0px`
                },
                children: this.instances.map(() => {
                    return {
                        class: 'fv-bg-secondary rounded border',
                        style: {
                            width: `${radius}px`,
                            height: `${radius}px`
                        }
                    }
                })
            }
        ]
    }
}



class DockerItemDetailsView implements VirtualDOM {

    public readonly state: PlatformState
    public readonly children: VirtualDOM[]
    public readonly executable: Executable
    public readonly instances: RunningApp[]
    public readonly class = 'd-flex flex-column justify-content-center p-1 fv-bg-background rounded'
    public readonly style = { userSelect: 'none' }

    constructor(
        params: {
            state: PlatformState,
            executable: Executable,
            instances: RunningApp[],
            details$
        }
    ) {
        Object.assign(this, params)

        let titleView = {
            innerText: attr$(
                params.details$,
                (details) => details ? `${this.executable.name}` : ``
            )
        }
        this.children = [
            titleView,
            child$(
                params.details$,
                (detail) => {
                    return detail && this.instances.length > 0
                        ? this.instancesListView()
                        : {}
                }
            )
        ]
    }

    instancesListView() {

        return {
            style: {
                minWidth: '150px'
            },
            children: this.instances.map((app, i) => {

                return {
                    class: 'fv-pointer px-1 rounded fv-hover-bg-background-alt d-flex align-items-center justify-content-between',
                    onclick: () => this.state.focus(app),
                    children: [
                        {
                            class: attr$(
                                this.state.runningApplication$,
                                (selected: RunningApp) => {

                                    return selected && selected.instanceId == app.instanceId
                                        ? 'fv-text-focus'
                                        : 'fv-text-primary'
                                }
                            ),
                            innerText: `-${i}-`
                        },
                        {
                            class: 'fv-text-error fv-hover-xx-lighter fas fa-times-circle',
                            onclick: (ev) => {
                                ev.stopPropagation()
                                this.state.close(app)
                            },
                        }]
                }
            })
        }
    }
}

export class DockerItemView implements VirtualDOM {

    public readonly baseClass = "d-flex align-items-center fv-pointer my-2 mx-1 border rounded p-2 fv-bg-background fv-hover-text-primary fv-hover-bg-secondary"
    public readonly class: any
    public readonly children: VirtualDOM[]
    public readonly executable: Executable

    public readonly instances: RunningApp[]
    public readonly state: PlatformState
    public readonly expanded$: Observable<boolean>

    constructor(
        params: {
            state: PlatformState,
            executable: Executable,
            instances: RunningApp[],
            expanded$: Observable<boolean>
        }) {

        Object.assign(this, params)
        this.children = this.instances.length == 0
            ? [new DockerItemIconView(params)]
            : [this.activeView()]
    }


    activeView() {

        let details$ = new BehaviorSubject(false)
        return {
            class: 'd-flex',
            onmouseenter: () => details$.next(true),
            onmouseleave: () => details$.next(false),
            children: [
                new DockerItemIconView({ state: this.state, instances: this.instances, executable: this.executable }),
                child$(
                    details$,
                    (d) => d
                        ? new DockerItemDetailsView({ state: this.state, instances: this.instances, executable: this.executable, details$ })
                        : {}
                )
            ]
        }
    }
}


export class AppsDockerView implements VirtualDOM {

    public readonly class = 'apps-docker-view border rounded d-flex flex-column p-1 fv-bg-primary'

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
