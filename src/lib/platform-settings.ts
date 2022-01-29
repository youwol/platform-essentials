import {VirtualDOM} from "@youwol/flux-view"
import {Observable, of, ReplaySubject} from "rxjs"
import {map} from "rxjs/operators"
import {AUTO_GENERATED} from "../auto_generated"
import {Parametrization, PlatformSettings} from "./platform-settings.models"
import {Asset} from "./clients/assets-gateway";
import {CdnSessionsStorageClient} from "./clients/cdn-sessions-storage";


export interface Executable {

    cdnPackage: string
    version: string
    parameters: { [key: string]: string }
    appMetadata$: Observable<{ name: string, icon: VirtualDOM }>
}

export function getExeUrl(exe: { cdnPackage, version, parameters }) {

    let base = `/applications/${exe.cdnPackage}/${exe.version}`
    if (Object.keys(exe.parameters).length == 0)
        return base

    let queryParams = Object.entries(exe.parameters)
        .reduce((acc, [k, v]) => `${acc}&${k}=${v}`, "")
    console.log("Exe url", {base, queryParams})
    return `${base}?${queryParams}`
}


export class PlatformSettingsStore {

    static defaultBg = "<svg xmlns='http://www.w3.org/2000/svg'  width='200' height='200' viewBox='0 0 200 200'><rect fill='#487346' width='200' height='200'/><g fill-opacity='1'><polygon  fill='#4c8e43' points='100 57.1 64 93.1 71.5 100.6 100 72.1'/><polygon  fill='#6aac5f' points='100 57.1 100 72.1 128.6 100.6 136.1 93.1'/><polygon  fill='#4c8e43' points='100 163.2 100 178.2 170.7 107.5 170.8 92.4'/><polygon  fill='#6aac5f' points='100 163.2 29.2 92.5 29.2 107.5 100 178.2'/><path  fill='#89CC7C' d='M100 21.8L29.2 92.5l70.7 70.7l70.7-70.7L100 21.8z M100 127.9L64.6 92.5L100 57.1l35.4 35.4L100 127.9z'/><polygon  fill='#768c3a' points='0 157.1 0 172.1 28.6 200.6 36.1 193.1'/><polygon  fill='#96ac58' points='70.7 200 70.8 192.4 63.2 200'/><polygon  fill='#B6CC76' points='27.8 200 63.2 200 70.7 192.5 0 121.8 0 157.2 35.3 192.5'/><polygon  fill='#96ac58' points='200 157.1 164 193.1 171.5 200.6 200 172.1'/><polygon  fill='#768c3a' points='136.7 200 129.2 192.5 129.2 200'/><polygon  fill='#B6CC76' points='172.1 200 164.6 192.5 200 157.1 200 157.2 200 121.8 200 121.8 129.2 192.5 136.7 200'/><polygon  fill='#768c3a' points='129.2 0 129.2 7.5 200 78.2 200 63.2 136.7 0'/><polygon  fill='#B6CC76' points='200 27.8 200 27.9 172.1 0 136.7 0 200 63.2 200 63.2'/><polygon  fill='#96ac58' points='63.2 0 0 63.2 0 78.2 70.7 7.5 70.7 0'/><polygon  fill='#B6CC76' points='0 63.2 63.2 0 27.8 0 0 27.8'/></g></svg>"

    static default: PlatformSettings = {
        you: {
            avatar: {
                class: 'rounded-circle fv-color-secondary fv-bg-primary text-center fv-text-on-primary d-flex flex-column',
                style: {
                    width: '35px',
                    height: '35px',
                    userSelect: 'none'
                },
                children: [
                    {
                        class: "m-auto",
                        innerText: '🦎'
                    }
                ]
            }
        },
        appearance: {
            theme: '@youwol/fv-widgets#latest~assets/styles/style.youwol.css',
            desktopStyle: {
                'background-image': `url("data:image/svg+xml;utf8,${PlatformSettingsStore.defaultBg.replace(/#/g, '%23')}")`
            }
        },
        browserApplications: [
            {
                package: "@youwol/flux-runner",
                version: "latest",
                icon: {class: 'fas fa-play'},
                displayName: "flux-runner",
                execution: {
                    standalone: false,
                    parametrized: [
                        {
                            match: {kind: 'flux-project'},
                            parameters: {id: 'rawId'}
                        }
                    ]
                }
            },
            {
                package: "@youwol/flux-builder",
                version: "latest",
                icon: {class: 'fas fa-play'},
                displayName: "flux-builder",
                execution: {
                    standalone: false,
                    parametrized: [
                        {
                            match: {kind: 'flux-project'},
                            parameters: {id: 'rawId'}
                        }
                    ]
                }
            },
            {
                package: "@youwol/stories",
                version: "latest",
                icon: {class: 'fas fa-book'},
                displayName: "Story",
                execution: {
                    standalone: false,
                    parametrized: [
                        {
                            match: {kind: 'story'},
                            parameters: {id: 'rawId'}
                        }
                    ]
                }
            },
            {
                package: "@youwol/explorer",
                version: "latest",
                icon: {class: 'fas fa-folder'},
                displayName: "Explorer",
                execution: {
                    standalone: true
                }
            },
            {
                package: "@youwol/developer-portal",
                version: "latest",
                icon: {class: 'fas fa-code'},
                displayName: "Dev. Portal",
                execution: {
                    standalone: true
                }
            },
            {
                package: "@youwol/exhibition-halls",
                version: "latest",
                icon: {class: 'fas fa-shopping-cart'},
                displayName: "Discover",
                execution: {
                    standalone: true
                }
            },
        ]
    }

    static settings$ = new ReplaySubject<PlatformSettings>(1)

    constructor() {
    }

    static fetchSettings() {
        /*
        Called at least when the file is loaded, see below
         */
        let sessionStorage = new CdnSessionsStorageClient()
        sessionStorage.applications
            .getData(AUTO_GENERATED.name, "settings")
            .pipe(
                map((savedData) => {
                    let settings = savedData as unknown as PlatformSettings
                    let you = settings['you'] ||
                        PlatformSettingsStore.default.you
                    let appearance = settings['appearance'] ||
                        PlatformSettingsStore.default.appearance
                    let browserApps = settings['browserApplications'] ||
                        PlatformSettingsStore.default.browserApplications
                    let missingDefaults = PlatformSettingsStore.default.browserApplications.filter(defaultApp => {
                        return browserApps.find(included => included.package == defaultApp.package) == undefined
                    })
                    browserApps = [...browserApps, ...missingDefaults]
                    return {you, appearance, browserApplications: browserApps} as PlatformSettings
                })
            )
            .subscribe((settings) => {
                PlatformSettingsStore.settings$.next(settings)
            })
    }

    static getDockerBarApps$(): Observable<Executable[]> {
        return this.settings$.pipe(
            map((s: PlatformSettings) => {
                return s.browserApplications
                    .filter(app => app.execution.standalone)
                    .map(app => {
                        return {
                            version: app.version,
                            cdnPackage: app.package,
                            parameters: {},
                            appMetadata$: of({icon: app.icon, name: app.displayName})
                        }
                    })
            })
        )
    }

    static getOpeningApps$(asset: Asset): Observable<Executable[]> {

        let parametrizationMatch = (asset: Asset, parametrization: Parametrization) =>
            Object.entries(parametrization.match).reduce((acc, [key, target]) => {
                return acc && asset[key] == target
            }, true)

        return this.settings$.pipe(
            map((s: PlatformSettings) => {

                return s.browserApplications.map(app =>
                    (app.execution.parametrized || [])
                        .filter(parametrized => parametrizationMatch(asset, parametrized))
                        .map(parametrized => {
                            let params = Object.entries(parametrized.parameters)
                                .map(([k, v]) => [k, asset[v]])
                                .reduce((acc, [k, v]) => ({...acc, [k]: v}), {})
                            return {
                                version: app.version,
                                cdnPackage: app.package,
                                parameters: params,
                                appMetadata$: of({name: app.displayName, icon: app.icon})
                            }
                        })
                ).flat()
            })
        )
    }

    static save(_settings: PlatformSettings) {
    }
}


PlatformSettingsStore.fetchSettings()
