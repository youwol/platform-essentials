import { attr$, HTMLElement$, VirtualDOM } from '@youwol/flux-view'
import { ReplaySubject } from 'rxjs'
import { v4 as uuidv4 } from 'uuid'
import { AssetsGateway, raiseHTTPErrors } from '@youwol/http-clients'
import { PlatformState } from './platform.state'
import { Executable } from './platform-settings'
import { ApplicationInfo } from './environment'

class IframeAppView implements VirtualDOM {
    tag = 'iframe'
    width = '100%'
    height = '100%'
    src: string
    connectedCallback: (HTMLElement$) => void

    constructor(src: string, iframe$: ReplaySubject<HTMLIFrameElement>) {
        this.src = src
        this.connectedCallback = (elem: HTMLElement$ & HTMLIFrameElement) => {
            iframe$.next(elem)
        }
    }
}

export class RunningApp implements Executable {
    public readonly state: PlatformState

    public readonly cdnPackage: string
    public readonly version: string
    public readonly url: string
    public readonly parameters: { [key: string]: string }
    public readonly appMetadata$ = new ReplaySubject<ApplicationInfo>(1)

    public readonly instanceId: string

    public readonly iframe$ = new ReplaySubject<HTMLIFrameElement>()

    public readonly view: VirtualDOM

    public readonly topBannerActions$ = new ReplaySubject<VirtualDOM>(1)
    public readonly topBannerUserMenu$ = new ReplaySubject<VirtualDOM>(1)
    public readonly topBannerYouwolMenu$ = new ReplaySubject<VirtualDOM>(1)

    public readonly header$ = new ReplaySubject<VirtualDOM>(1)
    public readonly snippet$ = new ReplaySubject<VirtualDOM>(1)

    htmlElement: HTMLElement

    constructor(params: {
        state: PlatformState
        cdnPackage: string
        instanceId?: string
        version: string
        metadata?: { name: string; icon: VirtualDOM }
        title?: string
        parameters?: { [key: string]: string }
    }) {
        Object.assign(this, params)
        new AssetsGateway.Client().cdn
            .getResource$<ApplicationInfo>({
                libraryId: btoa(this.cdnPackage),
                version: 'latest',
                restOfPath: '.yw_metadata.json',
            })
            .pipe(raiseHTTPErrors())
            .subscribe((appInfo) => {
                this.appMetadata$.next(appInfo)
                this.snippet$.next({ innerText: appInfo.displayName })
                this.header$.next(
                    new HeaderView({ title: appInfo.displayName }),
                )
            })

        this.version = this.version || 'latest'
        this.instanceId = this.instanceId || uuidv4()
        this.parameters = this.parameters || {}
        const queryParams = Object.entries(this.parameters).reduce(
            (acc, [k, v]) => `${acc}&${k}=${v}`,
            '',
        )
        this.url = `/applications/${this.cdnPackage}/${this.version}?instance-id=${this.instanceId}&${queryParams}`

        this.view = this.createView()
    }

    setSnippet(snippet: VirtualDOM) {
        this.snippet$.next(snippet)
    }

    terminateInstance() {
        this.htmlElement.remove()
    }

    createView() {
        return {
            class: attr$(this.state.runningApplication$, (app) =>
                app && app.instanceId == this.instanceId
                    ? 'h-100 w-100 d-flex'
                    : 'd-none',
            ),
            children: [new IframeAppView(this.url, this.iframe$)],
            connectedCallback: (elem: HTMLElement) => {
                this.htmlElement = elem
            },
        }
    }
}

class HeaderView implements VirtualDOM {
    public readonly class = 'px-1'
    public readonly style = {
        fontFamily: 'serif',
        fontSize: 'x-large',
        fontWeight: 'bold',
    }
    public readonly innerText: string
    public readonly title: string

    constructor(params: { title: string }) {
        Object.assign(this, params)
        this.innerText = this.title
    }
}
