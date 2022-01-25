import { attr$, child$, Stream$, VirtualDOM } from "@youwol/flux-view"
import { ExplorerState } from "../../../explorer.state"
import { ItemView } from "./item.view"
import { BehaviorSubject, Observable } from "rxjs"
import { BrowserNode, DriveNode, FolderNode, ItemNode } from "../../../nodes"
import { ChildApplicationAPI, PlatformSettingsStore } from "../../../.."
import { filter, map, mergeMap, take } from "rxjs/operators"
import { IPlatformHandler } from "../../../../platform.state"


export class DetailsContentView {

    public readonly class = 'fv-text-primary w-100 h-100 d-flex flex-column text-center overflow-auto'
    public readonly style = { 'max-height': '100%' }
    public readonly children: VirtualDOM[]

    public readonly items: BrowserNode[]

    public readonly state: ExplorerState

    constructor(params: { state: ExplorerState, items: BrowserNode[] }) {

        Object.assign(this, params)

        this.children = [
            {
                class: 'row w-100 justify-content-between py-2 border-bottom',
                style: {
                    fontWeight: 'bolder'
                },
                children: [
                    { innerText: 'Name', class: 'px-2 col-sm text-center' },
                    { innerText: 'Asset id', class: 'px-2 col-sm text-center' },
                    { innerText: 'Tree id', class: 'px-2 col-sm text-center' },
                    { innerText: 'URL', class: 'px-2 col-sm text-center' }
                ]
            },
            {
                class: 'flex-grow-1 overflow-auto',
                children: this.items.map(
                    (item: BrowserNode) => new RowView({ state: this.state, item })
                )
            }
        ]
    }
}


export class RowView implements VirtualDOM {

    static ClassSelector = "row-view"
    static ClassSelected = "fv-text-focus"

    public readonly baseClasses = `${RowView.ClassSelector} row w-100 text-center justify-content-between`
    public readonly class: Stream$<BrowserNode, string>
    public readonly children: VirtualDOM[]

    public readonly state: ExplorerState
    public readonly item: BrowserNode

    public readonly hoveredRow$ = new BehaviorSubject<BrowserNode>(undefined)

    public readonly platformHandler: IPlatformHandler

    public readonly onmouseenter = () => {
        this.hoveredRow$.next(this.item)
    }
    public readonly onmouseleave = () => {
        this.hoveredRow$.next(undefined)
    }

    public readonly onclick = (ev: PointerEvent) => {
        this.state.selectItem(this.item)
        ev.stopPropagation()
    }

    public readonly ondblclick = (ev) => {
        ev.stopPropagation()
        if (this.item instanceof FolderNode || this.item instanceof DriveNode) {
            this.state.openFolder(this.item)
            return
        }

        PlatformSettingsStore.getOpeningApps$(this.item as any).pipe(
            take(1),
            filter(apps => apps.length > 0),
            map(apps => apps[0]),
            mergeMap((app) => {
                return this.platformHandler.createInstance$({
                    cdnPackage: app.cdnPackage,
                    parameters: app.parameters,
                    title: this.item.name,
                    focus: true
                })
            })
        ).subscribe(() => { })
    }

    constructor(params: { state: ExplorerState, item: BrowserNode }) {

        Object.assign(this, params)

        this.platformHandler = ChildApplicationAPI.getOsInstance()

        this.class = attr$(
            this.state.selectedItem$,
            (node) => {
                return node && node.id == this.item.id ?
                    RowView.ClassSelected :
                    'fv-hover-bg-background-alt fv-pointer '
            },
            {
                wrapper: (d) => `${d} ${this.baseClasses}`,
                untilFirst: `waiting fv-hover-bg-background-alt fv-pointer`
            }
        )

        this.children = [
            {
                class: 'col-sm',
                children: [
                    new ItemView({ state: this.state, item: this.item, hovered$: this.hoveredRow$ })
                ]
            },
            new CellView({
                treeId: this.item.id,
                content: (this.item instanceof ItemNode) ? this.item.assetId : "",
                hoveredRow$: this.hoveredRow$
            }),
            new CellView({
                treeId: this.item.id,
                content: this.item.id,
                hoveredRow$: this.hoveredRow$
            }),
            new CellView({
                treeId: this.item.id,
                content: (this.item instanceof ItemNode && this.item.kind == 'data')
                    ? `/api/assets-gateway/raw/data/${this.item.rawId}`
                    : '',
                hoveredRow$: this.hoveredRow$
            })
        ]

    }
}


export class CellView implements VirtualDOM {

    static ClassSelector = "cell-view"
    public readonly class = `${CellView.ClassSelector} px-2 col-sm`

    public readonly children: VirtualDOM[]

    public readonly treeId: string
    public readonly content: string
    public readonly hoveredRow$: Observable<BrowserNode>

    constructor(params: {
        treeId: string,
        content: string,
        hoveredRow$: Observable<BrowserNode>
    }) {

        Object.assign(this, params)

        this.children = [
            {
                class: 'd-flex align-items-center h-100 my-auto mx-auto',
                style: {
                    width: 'fit-content'
                },
                children: [
                    {
                        class: 'mx-auto',
                        style: {
                            userSelect: 'none',
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            maxWidth: "100px",
                            overflow: "hidden",
                            width: 'fit-content'
                        },
                        innerText: this.content
                    },
                    child$(
                        this.hoveredRow$,
                        (item) =>
                            item && this.content && item.id == this.treeId
                                ? {
                                    tag: 'button',
                                    class: `fas fv-btn-secondary fa-copy mr-1 p-1 rounded mx-2`,
                                    onclick: () => {
                                        navigator.clipboard.writeText(this.content).then(() => {
                                            /*NOOP*/
                                        });
                                    }
                                }
                                : {}
                    )
                ]
            }
        ]
    }
}
