import { uuidv4 } from "@youwol/flux-core";
import { attr$, HTMLElement$, VirtualDOM } from "@youwol/flux-view";
import { ReplaySubject } from "rxjs";
import { Executable } from ".";
import { PlatformState } from "./platform.state"


export class RunningApp implements Executable {

    public readonly state: PlatformState

    public readonly cdnPackage: string
    public readonly version: string
    public readonly name: string
    public readonly icon: VirtualDOM
    public readonly url: string
    public readonly parameters: { [key: string]: string }

    public readonly instanceId: string
    public readonly title: string

    public readonly iframe$ = new ReplaySubject<HTMLIFrameElement>()

    public readonly view: VirtualDOM


    public readonly topBannerActions$ = new ReplaySubject<VirtualDOM>(1)
    public readonly topBannerUserMenu$ = new ReplaySubject<VirtualDOM>(1)
    public readonly topBannerYouwolMenu$ = new ReplaySubject<VirtualDOM>(1)

    public readonly snippet$ = new ReplaySubject<VirtualDOM>(1)

    htmlElement: HTMLElement

    constructor(params: {
        state: PlatformState,
        cdnPackage: string,
        name: string,
        icon: VirtualDOM,
        title?: string,
        parameters?: { [key: string]: string },
        instanceId?: string,
        version?: string
    }) {
        Object.assign(this, params)
        this.title = this.title || this.name
        this.snippet$.next({
            innerText: this.title
        })
        this.version = this.version || 'latest'
        this.instanceId = this.instanceId || uuidv4()
        this.parameters = this.parameters || {}
        let queryParams = Object.entries(this.parameters)
            .reduce((acc, [k, v]) => `${acc}&${k}=${v}`, "")
        this.url = `/applications/${this.cdnPackage}/${this.version}?instance-id=${this.instanceId}&${queryParams}`

        this.view = {
            class: attr$(
                this.state.runningApplication$,
                (app) => app && app.instanceId == this.instanceId
                    ? 'h-100 w-100 d-flex'
                    : 'd-none'
            ),
            children: [
                {
                    tag: 'iframe',
                    width: '100%',
                    height: '100%',
                    src: this.url,
                    connectedCallback: (elem: HTMLElement$ & HTMLIFrameElement) => {
                        this.iframe$.next(elem)
                    }
                }
            ],
            connectedCallback: (elem: HTMLElement) => {
                this.htmlElement = elem
            }
        }
    }

    setSnippet(snippet: VirtualDOM) {
        this.snippet$.next(snippet)
    }

    terminateInstance() {
        this.htmlElement.remove()
    }
}
