import {BehaviorSubject, Observable, of, Subject} from "rxjs"
import {RunningApp} from './running-app.view'
import {VirtualDOM} from '@youwol/flux-view'
import {YouwolBannerState} from './top-banner'
import {filter, map, take, tap} from 'rxjs/operators'
import {PlatformEvent} from "./platform.events"
import {getExeUrl, PlatformSettingsStore} from "./platform-settings";


export interface IPlatformHandler {

    runningApplications$: Observable<RunningApp[]>
    broadcastedEvents$: Observable<PlatformEvent>

    createInstance$({cdnPackage, parameters, focus, title}: {
        cdnPackage: string,
        title?: string,
        parameters?: { [key: string]: string },
        focus: boolean
    })

    broadcastEvent(event: PlatformEvent)
}


export class ChildApplicationAPI {

    static getAppInstanceId() {
        return new URLSearchParams(window.location.search).get("instance-id")
    }

    static getOsInstance(): IPlatformHandler {
        return parent['@youwol/platform-essentials']?.PlatformState.instance || new NoPlatformHandler()
    }

    static setProperties({ snippet }:
        { snippet: VirtualDOM }) {

        let os = ChildApplicationAPI.getOsInstance()
        if (!os)
            return
        let appInstanceId = ChildApplicationAPI.getAppInstanceId()
        os.runningApplications$.pipe(
            map(apps => apps.find(app => app.instanceId == appInstanceId)),
            filter(app => app != undefined),
            take(1)
        ).subscribe((app) => {
            app.setSnippet(snippet)
        })
    }
}

class NoPlatformHandler implements IPlatformHandler {

    public readonly runningApplications$ = new Subject<RunningApp[]>()
    public readonly broadcastedEvents$ = new Subject<PlatformEvent>()

    createInstance$({cdnPackage, version, parameters, focus, title}: {
        cdnPackage: string,
        version: string,
        title?: string,
        parameters?: { [key: string]: string },
        focus: boolean
    }) {
        let url = getExeUrl({cdnPackage, version, parameters})
        focus ? window.open(url, '_self') : window.open(url, '_blank')
    }

    broadcastEvent(event: PlatformEvent) {
        this.broadcastedEvents$.next(event)
    }
}

export function isPlatformInstance(p: IPlatformHandler): p is PlatformState {

    return (p as PlatformState).type && (p as PlatformState).type == 'PlatformState'
}

export class PlatformState implements IPlatformHandler {

    public readonly type = 'PlatformState'

    public readonly topBannerState = new YouwolBannerState()

    public readonly runningApplication$ = new BehaviorSubject<RunningApp>(undefined)
    public readonly runningApplications$ = new BehaviorSubject<RunningApp[]>([])

    public readonly broadcastedEvents$ = new Subject<PlatformEvent>()

    public readonly platformSettingsStore = new PlatformSettingsStore()
    static instance: PlatformState


    static setOsInstance(instance: PlatformState) {
        PlatformState.instance = instance
    }

    constructor() {

        PlatformState.setOsInstance(this)
    }

    getRunningApp(appId: string): RunningApp {
        return this.runningApplications$.getValue().find(app => app.instanceId === appId)
    }

    createInstance$({cdnPackage, version, parameters, focus, title}: {
        cdnPackage: string,
        title?: string,
        version: string,
        parameters?: { [key: string]: string },
        focus: boolean
    }) {

        return of({}).pipe(
            tap(() => {
                let app = new RunningApp({
                    version,
                    state: this,
                    parameters,
                    title: title,
                    cdnPackage
                })
                this.runningApplications$.next([...this.runningApplications$.getValue(), app])
                focus && this.focus(app.instanceId)
            })
        )
    }


    focus(instanceId: string) {
        let app = this.getRunningApp(instanceId)
        this.runningApplication$.next(app)
    }


    broadcastEvent(event: PlatformEvent) {
        this.broadcastedEvents$.next(event)
    }

    setTopBannerViews(
        appId: string,
        {actionsView, youwolMenuView, userMenuView}: {
            actionsView: VirtualDOM,
            youwolMenuView: VirtualDOM,
            userMenuView: VirtualDOM
        }) {
        let app = this.runningApplications$.getValue().find(app => app.instanceId === appId)
        app.topBannerActions$.next(actionsView)
        app.topBannerUserMenu$.next(userMenuView)
        app.topBannerYouwolMenu$.next(youwolMenuView)
    }

    close(instanceId: string) {
        let app = this.getRunningApp(instanceId)
        app.terminateInstance()
        this.runningApplications$.next(this.runningApplications$.getValue().filter(d => d != app))
        this.runningApplication$.next(undefined)
    }

    expand(instanceId: string) {
        let app = this.getRunningApp(instanceId)
        window.open(app.url, '_blank')
    }

    minimize(instanceId: string) {
        let app = this.getRunningApp(instanceId)
        this.runningApplication$.next(undefined)
        if (this.runningApplications$.getValue().includes(app))
            return
        this.runningApplications$.next([...this.runningApplications$.getValue(), app])
    }


    static childAppAPI: ChildApplicationAPI

}



