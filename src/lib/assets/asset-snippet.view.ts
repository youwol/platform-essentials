import { attr$, VirtualDOM } from "@youwol/flux-view"
import { Observable } from "rxjs"
import { Asset } from "../assets-gateway-client"

export interface AssetPresenterTrait {
    selectAsset: (assetId: string) => void
    selectedAsset$: Observable<string>
}

type AssetType = "flux-project" | "package" | "story" | "data"

let assetFaClasses: Record<AssetType, string> = {
    "flux-project": "fas fa-play",
    "package": "fas fa-puzzle-piece",
    "story": "fas fa-book",
    "data": "fas fa-database"
}

/**
 *  # AssetCardView
 * 
 * Card view of an asset.
 */
export class AssetSnippetView implements VirtualDOM {

    static ClassSelector = "asset-card-view"
    public readonly baseClasses = `${AssetSnippetView.ClassSelector} fv-bg-background d-flex overflow-hidden flex-column text-center rounded fv-pointer fv-color-primary fv-hover-color-focus position-relative my-2`
    public readonly class: any
    public readonly style = { width: '250px', height: '250px' }

    public readonly children: Array<VirtualDOM>

    public readonly onclick: () => void

    public readonly asset: Asset
    public readonly state: AssetPresenterTrait

    constructor(parameters: {
        asset: Asset,
        state: AssetPresenterTrait
    }) {
        Object.assign(this, parameters)

        this.class = attr$(
            this.state.selectedAsset$,
            (assetId) => {
                return this.asset.assetId == assetId ? 'selected fv-bg-secondary fv-color-focus' : ''
            },
            {
                wrapper: (d) => `${d} ${this.baseClasses}`,
                untilFirst: this.baseClasses
            }
        )
        this.children = [
            {
                class: 'border rounded fv-bg-primary position-absolute text-center',
                style: { width: '25px', height: '25px' },
                children: [{ tag: 'i', class: ` ${assetFaClasses[this.asset.kind]} fv-text-secondary w-100` }]
            },
            this.asset.thumbnails[0]
                ? this.thumbnailView()
                : this.noThumbnailView(),
            this.ribbonView(),
        ]
        this.onclick = () => {
            this.state.selectAsset(this.asset.assetId)
        }
    }

    ribbonView(): VirtualDOM {

        return {
            class: 'py-3 fv-bg-background-alt position-absolute w-100 d-flex align-items-center justify-content-around',
            style: {
                bottom: '0px',
                background: 'linear-gradient(rgba(0,0,0,0), rgba(0,0,0,1))'
            },
            children: [
                {
                    innerText: this.asset.name
                }
            ]
        }
    }

    thumbnailView(): VirtualDOM {

        return {
            tag: 'img', class: "p-1", src: this.asset.thumbnails[0],
            style: { 'margin-top': 'auto', 'margin-bottom': 'auto' }
        }
    }

    noThumbnailView(): VirtualDOM {

        return {
            class: 'flex-grow-1',
            style: { minHeight: " 0px" }
        }
    }
}
