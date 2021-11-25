import { attr$, child$, childrenAppendOnly$, VirtualDOM } from "@youwol/flux-view";
import { BehaviorSubject } from "rxjs";
import { filter, map } from "rxjs/operators";
import { PlatformState } from "../../platform.state";
import { FolderContentView } from "./folder-content/folder-content.view";
import { HeaderPathView } from "./header-path.view";
import { RunningApp } from "./running-app.view";
import { TerminalView } from "./terminal/terminal.view";


export type DisplayMode = "cards" | "miniatures" | "details"


export class MainPanelView implements VirtualDOM {

    public readonly class = "w-100 h-100 flex-grow-1 d-flex flex-column"
    public readonly style = {
        minHeight: '0px'
    }
    public readonly children: VirtualDOM[]

    public readonly state: PlatformState

    public readonly displayMode$ = new BehaviorSubject<DisplayMode>('details')

    cache = {}

    constructor(params: { state: PlatformState }) {
        Object.assign(this, params)

        console.log("MainPanelView")
        this.children = [
            {
                class: attr$(
                    this.state.runningApplication$,
                    (app) => app == undefined ? 'w-100 d-flex' : 'd-none'
                ),
                children: [
                    new HeaderPathView({ state: this.state, displayMode$: this.displayMode$ }),
                ]
            },
            {
                class: 'flex-grow-1',
                style: { minHeight: '0px' },
                children: [
                    {
                        class: attr$(
                            this.state.runningApplication$,
                            (app) => app == undefined ? 'h-100 d-flex' : 'd-none'
                        ),
                        children: [
                            child$(
                                this.state.currentFolder$,
                                ({ folder }) => {
                                    return new FolderContentView({ state: this.state, folderId: folder.id, groupId: folder.groupId, displayMode$: this.displayMode$ })
                                }
                            )
                        ]
                    },
                    {
                        class: attr$(
                            this.state.runningApplication$,
                            (app) => app == undefined ? 'd-none' : 'h-100 d-flex'
                        ),
                        children: childrenAppendOnly$(
                            this.state.runningApplication$.pipe(
                                filter(app => app && this.cache[app.instanceId] == undefined),
                                map(app => [app])
                            ),
                            (runningApp: RunningApp) => {
                                let view = runningApp.view
                                this.cache[runningApp.instanceId] = view
                                return view
                            }
                        )

                    },
                ]
            },
            new TerminalView()

        ]
    }
}
