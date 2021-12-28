import { VirtualDOM } from "@youwol/flux-view"
import { ExplorerState } from "../../../explorer.state"
import { BrowserNode } from "../../../nodes"
import { ItemView } from "./item.view"


export class MiniaturesContentView {

    public readonly class = 'd-flex flex-wrap w-100 overflow-auto'
    public readonly style = { 'max-height': '100%' }
    public readonly children: VirtualDOM[]

    public readonly items: BrowserNode[]

    public readonly state: ExplorerState

    constructor(params: { state: ExplorerState, items: BrowserNode[] }) {

        Object.assign(this, params)

        console.log("Create cards view", { items: this.items })
        this.children = this.items.map((item: BrowserNode) => {
            return new ItemView({ state: this.state, item })
        })
    }
}
