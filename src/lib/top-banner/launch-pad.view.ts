import { attr$, child$, children$, VirtualDOM } from '@youwol/flux-view'
import {
    ApplicationInfo,
    Executable,
    Installer,
    PlatformState,
    RunningApp,
} from '../core'
import { map } from 'rxjs/operators'
import { BehaviorSubject, Observable } from 'rxjs'

export class ApplicationsLaunchPad implements VirtualDOM {
    public readonly class = 'd-flex flex-wrap justify-content-center'
    public readonly style = {
        width: '75vw',
        height: '75vh',
    }
    public readonly state: PlatformState
    public readonly children

    constructor(params: { state: PlatformState }) {
        Object.assign(this, params)
        this.children = [
            {
                class: 'h-100 w-100 d-flex flex-column',
                children: [
                    child$(this.state.runningApplications$, (apps) =>
                        apps.length > 0
                            ? new RunningAppsView({ state: this.state })
                            : {},
                    ),
                    new NewAppsView({ state: this.state }),
                ],
            },
        ]
    }
}

class NewAppsView implements VirtualDOM {
    public readonly class = 'w-100 flex-grow-1 overflow-auto'
    public readonly children: VirtualDOM[]
    public readonly state: PlatformState

    constructor(params: { state: PlatformState }) {
        Object.assign(this, params)
        this.children = [
            {
                class: 'text-center fv-text-focus fv-border-bottom-focus',
                innerText: 'Launch pad',
                style: {
                    fontSize: 'x-large',
                    fontWeight: 'bolder',
                },
            },
            {
                class: 'd-flex flex-wrap justify-content-center',
                children: children$(
                    Installer.getApplicationsInfo$().pipe(
                        map((apps) => {
                            return apps.filter(
                                (app) => app.execution.standalone,
                            )
                        }),
                    ),
                    (apps) => {
                        return apps.map((app) => {
                            return new NewAppView({
                                state: this.state,
                                app,
                            })
                        })
                    },
                ),
            },
        ]
    }
}
class NewAppView implements VirtualDOM {
    public readonly class =
        'border rounded mx-3 my-2 fv-hover-xx-lighter fv-pointer fv-text-primary fv-hover-bg-background-alt'

    public readonly state: PlatformState
    public readonly app: ApplicationInfo
    public readonly style = {
        width: '100px',
        height: '100px',
        position: 'relative',
    }
    public readonly children: VirtualDOM[]

    public readonly onclick = () => {
        this.state
            .createInstance$({
                cdnPackage: this.app.cdnPackage,
                version: 'latest',
                focus: true,
            })
            .subscribe()
    }
    constructor(params: { state: PlatformState; app: ApplicationInfo }) {
        Object.assign(this, params)
        this.children = [
            {
                class: 'd-flex w-100 h-100 justify-content-center mx-auto flex-column h-100 w-100 text-center',
                children: [
                    this.app.graphics.appIcon,
                    { class: 'mt-1', innerText: this.app.displayName },
                ],
            },
        ]
    }
}

class RunningAppsView implements VirtualDOM {
    public readonly class = 'w-100  overflow-auto mb-4'
    public readonly children: VirtualDOM[]
    public readonly state: PlatformState

    constructor(params: { state: PlatformState }) {
        Object.assign(this, params)
        const expanded$ = new BehaviorSubject(false)
        this.children = [
            {
                class: 'text-center fv-text-focus fv-border-bottom-focus',
                innerText: 'Running apps',
                style: {
                    fontSize: 'x-large',
                    fontWeight: 'bolder',
                },
            },
            {
                class: 'd-flex justify-content-center',
                children: children$(
                    this.state.runningApplications$,
                    (runningApps) => {
                        const executables: { [key: string]: Executable } = [
                            ...runningApps,
                        ].reduce(
                            (acc, e) => ({ ...acc, [e.cdnPackage]: e }),
                            {},
                        )

                        return Object.values(executables).map(
                            (executable: Executable) =>
                                new RunningAppView({
                                    executable,
                                    instances: runningApps.filter(
                                        (app) =>
                                            app.cdnPackage ==
                                            executable.cdnPackage,
                                    ),
                                    expanded$,
                                    state: this.state,
                                }),
                        )
                    },
                ),
            },
        ]
    }
}

export class RunningAppView implements VirtualDOM {
    public readonly class =
        'd-flex flex-column align-items-center m-2 border rounded p-2'
    public readonly children: VirtualDOM[]
    public readonly executable: Executable
    public readonly style = {
        minWidth: '200px',
    }
    public readonly instances: RunningApp[]
    public readonly state: PlatformState

    constructor(params: {
        state: PlatformState
        executable: Executable
        instances: RunningApp[]
        expanded$: Observable<boolean>
    }) {
        Object.assign(this, params)
        this.children = [
            this.headerView(),
            new InstancesListView({
                state: this.state,
                instances: this.instances,
                executable: this.executable,
            }),
        ]
    }

    headerView() {
        return {
            class: `fv-text-primary d-flex align-items-center`,
            children: [
                child$(this.executable.appMetadata$, (d) => d.graphics.appIcon),
                {
                    tag: 'span',
                    class: 'mx-2',
                    innerText: attr$(
                        this.executable.appMetadata$,
                        (d) => d.displayName,
                    ),
                },
            ],
        }
    }
}

class InstancesListView implements VirtualDOM {
    public readonly state: PlatformState
    public readonly children: VirtualDOM[]
    public readonly executable: Executable
    public readonly instances: RunningApp[]
    public readonly class =
        'd-flex flex-column justify-content-center p-1 w-100 rounded'
    public readonly style = { userSelect: 'none' }

    constructor(params: {
        state: PlatformState
        executable: Executable
        instances: RunningApp[]
    }) {
        Object.assign(this, params)

        this.children = [this.instancesListView()]
    }

    instancesListView() {
        return {
            class: 'w-100',
            children: this.instances.map((app) => {
                return {
                    class: attr$(
                        this.state.runningApplication$,
                        (selected: RunningApp): string => {
                            return selected &&
                                selected.instanceId == app.instanceId
                                ? 'fv-text-focus fv-border-focus'
                                : 'fv-text-primary fv-border-primary'
                        },
                        {
                            wrapper: (d) =>
                                `${d} fv-pointer px-1 my-1 rounded fv-hover-bg-background-alt d-flex align-items-center justify-content-between`,
                        },
                    ),
                    onclick: () => this.state.focus(app.instanceId),
                    children: [
                        {
                            class: 'px-1',
                            children: [
                                child$(app.snippet$, (snippet) => snippet),
                            ],
                        },
                        {
                            class: 'fv-text-error fv-hover-xx-lighter fas fa-times-circle',
                            onclick: (ev) => {
                                ev.stopPropagation()
                                this.state.close(app.instanceId)
                            },
                        },
                    ],
                }
            }),
        }
    }
}
