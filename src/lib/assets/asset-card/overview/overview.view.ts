import { HTMLElement$, VirtualDOM } from "@youwol/flux-view"
import { BehaviorSubject, combineLatest, Observable, Subject } from "rxjs"
import { AssetTitleView } from "./title.view"
import { AssetDescriptionView } from "./description.view"
import { AssetTagsView } from "./tags.view"
import { AssetScreenShotsView } from "./screenshots.view"
import { sectionTitleView } from "../misc.view"
import { Asset } from "../../.."
import { mergeMap, scan, shareReplay } from "rxjs/operators"
import { AssetsGatewayClient } from "../../../assets-gateway-client"
import { uuidv4 } from "@youwol/flux-core"


export class AssetOverview implements VirtualDOM {

    static ClassSelector = "asset-overview"
    public readonly class = `${AssetOverview.ClassSelector} w-100 p-3 px-5 h-100 overflow-auto fv-text-primary`
    public readonly children: VirtualDOM[]

    public readonly asset: Asset

    public readonly name$: BehaviorSubject<string>
    public readonly tags$: BehaviorSubject<string[]>
    public readonly description$: BehaviorSubject<string>
    public readonly images$: BehaviorSubject<string[]>
    public readonly actionsFactory: (asset: Asset) => VirtualDOM
    public readonly forceReadonly: boolean

    public readonly connectedCallback: (elem: HTMLElement$ & HTMLDivElement) => void

    public readonly assetOutput$: Subject<Asset>

    public readonly assetsGtwClient = new AssetsGatewayClient()

    constructor(params: {
        asset: Asset,
        actionsFactory: (asset: Asset) => VirtualDOM,
        assetOutput$: Subject<Asset>,
        withTabs?: { [key: string]: VirtualDOM },
        forceReadonly?: boolean
    },
    ) {

        Object.assign(this, params)
        this.name$ = new BehaviorSubject(this.asset.name)
        this.tags$ = new BehaviorSubject(this.asset.tags)
        this.description$ = new BehaviorSubject(this.asset.description)
        this.images$ = new BehaviorSubject(this.asset.images)
        let actionsView = this.actionsFactory(this.asset)

        let updatedAsset$ = combineLatest([
            this.name$,
            this.tags$,
            this.images$,
            this.description$
        ]).pipe(
            mergeMap(([name, tags, images, description]) => {
                return this.assetsGtwClient.updateAsset$(this.asset.assetId, { name, tags, description })
            }),
            shareReplay(1)
        )

        let screenShotsView = new AssetScreenShotsView({
            asset: this.asset,
            images$: this.images$,
            forceReadonly: this.forceReadonly
        })

        this.children = [
            new AssetTitleView({
                name$: this.name$,
                asset: this.asset,
                forceReadonly: this.forceReadonly
            }),
            actionsView,
            sectionTitleView("Tags"),
            new AssetTagsView({
                tags$: this.tags$,
                asset: this.asset,
                forceReadonly: this.forceReadonly
            }),
            sectionTitleView("ScreenShots"),
            screenShotsView,
            sectionTitleView("Descriptions"),
            new AssetDescriptionView({
                description$: this.description$,
                asset: this.asset,
                forceReadonly: this.forceReadonly
            })
        ]
        this.connectedCallback = (elem) => {
            elem.ownSubscriptions(
                updatedAsset$.subscribe((asset: Asset) => {
                    this.assetOutput$.next(asset)
                }),
                screenShotsView.fileUploaded$.pipe(
                    mergeMap(({ file, src }) => {
                        let id = Math.floor(Math.random() * 1e5) + "." + file.name.split('.').slice(-1)
                        return this.assetsGtwClient.addPicture$(this.asset.assetId, { id, file: file })
                    })
                ).subscribe((asset: Asset) => {
                    this.assetOutput$.next(asset)
                }),
                screenShotsView.fileRemoved$.pipe(
                    mergeMap(({ imageId }) => this.assetsGtwClient.removePicture$(this.asset.assetId, imageId)
                    )
                ).subscribe((asset: Asset) => {
                    this.assetOutput$.next(asset)
                })
            )
        }
    }

}
