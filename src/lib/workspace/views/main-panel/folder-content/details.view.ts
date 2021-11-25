import { attr$, child$, VirtualDOM } from "@youwol/flux-view"
import { PlatformState } from "../../../platform.state"
import { Action } from "../../../actions.factory"
import { ItemView } from "./item.view"
import { BehaviorSubject } from "rxjs"
import { BrowserNode, DriveNode, FolderNode, ItemNode } from "../../../nodes"


export class DetailsContentView {

    public readonly class = 'fv-text-primary w-100 h-100 d-flex flex-column text-center overflow-auto'
    public readonly style = { 'max-height': '100%' }
    public readonly children: VirtualDOM[]

    public readonly items: BrowserNode[]

    public readonly state: PlatformState

    constructor(params: { state: PlatformState, items: BrowserNode[] }) {

        Object.assign(this, params)
        console.log("DetailsContentView")
        let hoveredRow$ = new BehaviorSubject<BrowserNode>(undefined)
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
                children: this.items
                    .map((item: BrowserNode) => {
                        let treeId = item.id
                        let assetId = ""
                        let url = ""
                        if (item instanceof ItemNode && item.kind == 'data') {
                            url = `/api/assets-gateway/raw/data/${item.rawId}`
                        }
                        if (item instanceof ItemNode) {
                            assetId = item.assetId
                        }
                        return {
                            class: attr$(
                                this.state.selectedItem$,
                                (node) => {
                                    return node && node.id == item.id ?
                                        'fv-text-focus' :
                                        'fv-hover-bg-background-alt fv-pointer '
                                },
                                {
                                    wrapper: (d) => `row w-100 justify-content-between ${d} text-center`,
                                    untilFirst: 'fv-hover-bg-background-alt fv-pointer row w-100 text-center justify-content-between'
                                }
                            ),
                            onclick: () => {
                                this.state.selectItem(item)
                            },
                            ondblclick: () => {
                                if (item instanceof FolderNode || item instanceof DriveNode)
                                    this.state.openFolder(item)
                            },
                            onmouseenter: () => hoveredRow$.next(item),
                            onmouseleave: () => hoveredRow$.next(undefined),
                            children: [
                                { class: 'col-sm', children: [new ItemView({ state: this.state, item, hovered$: hoveredRow$ })] },
                                this.cellView(treeId, assetId, hoveredRow$),
                                this.cellView(treeId, treeId, hoveredRow$),
                                this.cellView(treeId, url, hoveredRow$),
                            ]
                        }
                    })
            }
        ]
    }

    actionView(action: Action) {
        return {
            class: `${action.icon} fv-hover-text-focus fv-pointer mx-2`,
            onclick: () => action.exe()
        }
    }

    cellPermissionsView(item) {

        return {
            class: 'col-sm',
            children: [
                {
                    class: 'd-flex align-items-center justify-content-center w-100 h-100 my-auto mx-auto',
                    children: [
                        {
                            class: 'fas fa-glasses fv-text-success mx-1'
                        },
                        {
                            class: 'fas fa-tools fv-text-success mx-1'
                        }
                    ]
                }
            ]
        }
    }

    cellView(id: string, content: string, hoveredRow$): VirtualDOM {

        return {
            class: 'px-2 col-sm',
            children: [
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
                            innerText: content
                        },
                        child$(
                            hoveredRow$,
                            (item) =>
                                item && content && item.id == id
                                    ? {
                                        tag: 'button',
                                        class: `fas fv-btn-secondary fa-copy mr-1 p-1 rounded mx-2`,
                                        onclick: () => {
                                            navigator.clipboard.writeText(content).then(() => {/*NOOP*/ });
                                        }
                                    }
                                    : {}

                        )
                    ]
                }
            ]
        }
    }
}
