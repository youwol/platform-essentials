import { HTMLElement$, VirtualDOM } from '@youwol/flux-view'
import { BehaviorSubject, combineLatest, Subject } from 'rxjs'
import { mergeMap, shareReplay } from 'rxjs/operators'
import { AssetsGateway } from '@youwol/http-clients'
import { sectionTitleView } from '../misc.view'
import { AssetDescriptionView } from './description.view'
import { AssetScreenShotsView } from './screenshots.view'
import { AssetTagsView } from './tags.view'
import { AssetTitleView } from './title.view'

type Asset = AssetsGateway.Asset

export class AssetOverview implements VirtualDOM {
    static ClassSelector = 'asset-overview'
    public readonly class = `${AssetOverview.ClassSelector} w-100 p-3 px-5 h-100 overflow-auto fv-text-primary`
    public readonly children: VirtualDOM[]

    public readonly asset: Asset

    public readonly name$: BehaviorSubject<string>
    public readonly tags$: BehaviorSubject<string[]>
    public readonly description$: BehaviorSubject<string>
    public readonly images$: BehaviorSubject<string[]>
    public readonly actionsFactory: (asset: Asset) => VirtualDOM
    public readonly forceReadonly: boolean

    public readonly connectedCallback: (
        elem: HTMLElement$ & HTMLDivElement,
    ) => void

    public readonly assetOutput$: Subject<Asset>

    public readonly assetsGtwClient = new AssetsGateway.AssetsGatewayClient()

    constructor(params: {
        asset: Asset
        actionsFactory: (asset: Asset) => VirtualDOM
        assetOutput$: Subject<Asset>
        withTabs?: { [key: string]: VirtualDOM }
        forceReadonly?: boolean
        [key: string]: unknown
    }) {
        Object.assign(this, params)
        this.name$ = new BehaviorSubject(this.asset.name)
        this.tags$ = new BehaviorSubject(this.asset.tags)
        this.description$ = new BehaviorSubject(this.asset.description)
        this.images$ = new BehaviorSubject(this.asset.images)
        const actionsView = this.actionsFactory(this.asset)

        const updatedAsset$ = combineLatest([
            this.name$,
            this.tags$,
            this.images$,
            this.description$,
        ]).pipe(
            mergeMap(([name, tags, _, description]) => {
                return this.assetsGtwClient.assets.update$(this.asset.assetId, {
                    name,
                    tags,
                    description,
                })
            }),
            shareReplay(1),
        )

        const screenShotsView = new AssetScreenShotsView({
            asset: this.asset,
            images$: this.images$,
            forceReadonly: this.forceReadonly,
        })

        this.children = [
            new AssetTitleView({
                name$: this.name$,
                asset: this.asset,
                forceReadonly: this.forceReadonly,
            }),
            actionsView,
            sectionTitleView('Tags'),
            new AssetTagsView({
                tags$: this.tags$,
                asset: this.asset,
                forceReadonly: this.forceReadonly,
            }),
            sectionTitleView('ScreenShots'),
            screenShotsView,
            sectionTitleView('Descriptions'),
            new AssetDescriptionView({
                description$: this.description$,
                asset: this.asset,
                forceReadonly: this.forceReadonly,
            }),
        ]
        this.connectedCallback = (elem) => {
            elem.ownSubscriptions(
                updatedAsset$.subscribe((asset: Asset) => {
                    this.assetOutput$.next(asset)
                }),
                screenShotsView.fileUploaded$
                    .pipe(
                        mergeMap(({ file }) => {
                            const id =
                                Math.floor(Math.random() * 1e5) +
                                '.' +
                                file.name.split('.').slice(-1)
                            return this.assetsGtwClient.assets.addPicture$(
                                this.asset.assetId,
                                id,
                                file,
                            )
                        }),
                    )
                    .subscribe((asset: Asset) => {
                        this.assetOutput$.next(asset)
                    }),
                screenShotsView.fileRemoved$
                    .pipe(
                        mergeMap(({ imageId }) =>
                            this.assetsGtwClient.assets.removePicture$(
                                this.asset.assetId,
                                imageId,
                            ),
                        ),
                    )
                    .subscribe((asset: Asset) => {
                        this.assetOutput$.next(asset)
                    }),
            )
        }
    }
}
