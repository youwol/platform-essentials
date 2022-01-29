import {VirtualDOM} from "@youwol/flux-view"
import {Observable, of, ReplaySubject} from "rxjs"
import {map} from "rxjs/operators"
import {AUTO_GENERATED} from "../auto_generated"
import {Parametrization, PlatformSettings, UserSettingsClient} from "./clients"
import {Asset} from "./clients/assets-gateway";
import {CdnSessionsStorageClient} from "./clients/cdn-sessions-storage";


export interface Executable {

    name: string
    cdnPackage: string
    url: string
    parameters: { [key: string]: string }
    icon: VirtualDOM
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
            desktopImage: `url("data:image/svg+xml;utf8,${PlatformSettingsStore.defaultBg}")`
        },
        applications: {
            associations: [
                {
                    cdnPackage: "@youwol/flux-runner",
                    version: "latest",
                    canOpen: "return (asset) => asset.kind == 'flux-project'",
                    parameters: "return (asset) => ({ 'id':asset.rawId })"
                },
                {
                    cdnPackage: "@youwol/flux-builder",
                    version: "latest",
                    canOpen: "return (asset) => asset.kind == 'flux-project'",
                    parameters: "return (asset) => ({ 'id':asset.rawId })"
                },
                {
                    cdnPackage: "@youwol/stories",
                    version: "latest",
                    canOpen: "return (asset) => asset.kind == 'story'",
                    parameters: "return (asset) => ({ 'id':asset.rawId })"
                }
            ]
        },
        dockerBar: {
            applications: [
                {
                    cdnPackage: "@youwol/explorer",
                    version: "latest"
                },
                {
                    cdnPackage: "@youwol/exhibition-halls",
                    version: "latest"
                },
                {
                    cdnPackage: "@youwol/developer-portal",
                    version: "latest"
                }
            ]
        },
    }

    static userSettingsClient = new UserSettingsClient()

    static settings$ = PlatformSettingsStore.userSettingsClient.querySettings(AUTO_GENERATED.name, PlatformSettingsStore.default)

    constructor() {

    }

    static desktopImages$ = PlatformSettingsStore.settings$.pipe(
        map((s: PlatformSettings) => s.appearance.desktopImage.replace(/#/g, '%23'))
    )

    /** Mock implementation until expected metadata are published with cdn package 
     * 
    */
    static queryMetadata$(cdnPackage: string): Observable<{ name: string, icon: string }> {

        let metadata = {
            "@youwol/explorer": {
                name: 'Explorer',
                icon: '{ "class": "fas fa-folder"}'
            },
            "@youwol/exhibition-halls": {
                name: 'Discover',
                icon: '{ "class": "fas fa-shopping-cart"}'
            },
            "@youwol/developer-portal": {
                name: 'Dev. Portal',
                icon: '{ "class": "fas fa-code"}'
            },
            "@youwol/flux-runner": {
                name: 'Flux runner',
                icon: '{ "class":"d-flex align-items-center", "children":[{"class": "fas fa-project-diagram"},{"class": "ml-1 fas fa-play"}]}'
            },
            "@youwol/flux-builder": {
                name: 'Flux builder',
                icon: '{ "class":"d-flex align-items-center", "children":[{"class": "fas fa-project-diagram"},{"class": "ml-1 fas fa-tools"}]}'
            },
            "@youwol/stories": {
                name: 'Story',
                icon: '{ "class": "fas fa-book-open"}'
            }
        }
        return of(metadata[cdnPackage])
    }


    static getDockerBarApps$(): Observable<Executable[]> {

        return this.settings$.pipe(
            mergeMap((s: PlatformSettings) =>
                forkJoin(s.dockerBar.applications.map(app => {

                    return this.queryMetadata$(app.cdnPackage).pipe(
                        map((metadata) => ({
                            ...app,
                            ...metadata,
                            url: `/applications/${app.cdnPackage}/${app.version}`,
                            icon: JSON.parse(metadata.icon),
                            parameters: {}
                        }))
                    )
                })
                )
            )
        )
    }


    static getOpeningApps$(asset: Asset): Observable<Executable[]> {

        let evalFct = (code: string | ((asset: Asset) => { [key: string]: string } | boolean)) => {
            return typeof (code) == 'string'
                ? new Function(code)()(asset)
                : code(asset)
        }
        return this.settings$.pipe(
            map((s: PlatformSettings) => s.applications.associations),
            mergeMap((apps: ApplicationAssociation[]) => {

                let openingApps = apps.filter((app) => evalFct(app.canOpen))
                return openingApps.length == 0
                    ? of([])
                    : forkJoin(openingApps.map(app => {

                        return this.queryMetadata$(app.cdnPackage).pipe(
                            map((metadata) => ({
                                ...metadata,
                                ...app,
                                icon: JSON.parse(metadata.icon),
                                url: `/applications/${app.cdnPackage}/${app.version}`,
                                parameters: evalFct(app.parameters)
                            }))
                        )
                    }))
            })
        )
    }

    static save(settings: PlatformSettings) {
        PlatformSettingsStore.userSettingsClient.updateSettings(AUTO_GENERATED.name, settings)
    }
}
