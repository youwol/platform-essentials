import { BehaviorSubject, of } from "rxjs"
import { RunningApp } from './running-app.view'
import { VirtualDOM } from '@youwol/flux-view'
import { YouwolBannerState } from './top-banner'
import { PlatformSettingsStore } from './platform-settings'
import { tap } from 'rxjs/operators'



export class PlatformState {

    public readonly topBannerState = new YouwolBannerState()

    public readonly runningApplication$ = new BehaviorSubject<RunningApp>(undefined)
    public readonly runningApplications$ = new BehaviorSubject<RunningApp[]>([])

    static instance: PlatformState
    static setInstance(instance: PlatformState) {
        PlatformState.instance = instance
    }

    static getInstance() {
        return parent['@youwol/platform-essentials']?.PlatformState.instance || PlatformState.instance
    }

    constructor() {

        PlatformState.setInstance(this)
    }


    createInstance$({ cdnPackage, parameters, focus }: {
        cdnPackage: string,
        parameters?: { [key: string]: string },
        focus: boolean
    }) {
        return PlatformSettingsStore.queryMetadata$(cdnPackage).pipe(
            tap((metadata) => {

                let app = new RunningApp({
                    ...metadata,
                    state: this,
                    parameters,
                    cdnPackage,
                    icon: JSON.parse(metadata.icon)
                })
                this.runningApplications$.next([...this.runningApplications$.getValue(), app])
                focus && this.focus(app)
            })
        )
    }


    focus(app: RunningApp) {
        this.runningApplication$.next(app)
    }

    toggleNavigationMode() {
        this.runningApplication$.next(undefined)
    }

    setTopBannerViews(
        appId: string,
        { actionsView, badgesView, youwolMenuView, userMenuView }: {
            actionsView: VirtualDOM,
            badgesView: VirtualDOM,
            youwolMenuView: VirtualDOM,
            userMenuView: VirtualDOM
        }) {
        let app = this.runningApplications$.getValue().find(app => app.instanceId === appId)
        app.topBannerActions$.next(actionsView)
        app.topBannerUserMenu$.next(userMenuView)
        app.topBannerYouwolMenu$.next(youwolMenuView)
    }

    close(app: RunningApp) {
        app.terminateInstance()
        this.runningApplications$.next(this.runningApplications$.getValue().filter(d => d != app))
        this.runningApplication$.next(undefined)
    }

    expand(app: RunningApp) {
        window.open(app.url, '_blank')
    }

    minimize(preview: RunningApp) {

        this.runningApplication$.next(undefined)
        if (this.runningApplications$.getValue().includes(preview))
            return
        this.runningApplications$.next([...this.runningApplications$.getValue(), preview])
    }
}



