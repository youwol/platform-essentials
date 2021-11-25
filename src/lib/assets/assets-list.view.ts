import { child$, childrenAppendOnly$, VirtualDOM } from "@youwol/flux-view"
import { Observable, ReplaySubject } from "rxjs"
import { Asset } from "../assets-gateway-client"
import { ywSpinnerView } from "../misc-views/youwol-spinner.view"
import { AssetSnippetView, AssetPresenterTrait } from "./asset-snippet.view"

/**
 * # AssetsListView
 */
export class AssetsListView implements VirtualDOM {

    static ClassSelector = "assets-list-view"
    public readonly class = `${AssetsListView.ClassSelector} h-100 overflow-auto w-100`
    public readonly style = { minHeight: '0px' }
    public readonly children: VirtualDOM

    public readonly assets$: Observable<Asset[]>
    public readonly state: AssetPresenterTrait

    constructor(parameters: {
        assets$: Observable<Asset[]>,
        state: AssetPresenterTrait
    }) {
        Object.assign(this, parameters)

        let elementInDoc$ = new ReplaySubject(1)
        this.children = [
            {
                class: "w-100 d-flex flex-wrap justify-content-around ",
                children: childrenAppendOnly$(
                    this.assets$,
                    (asset: Asset) => new AssetSnippetView({ asset, state: this.state }),
                    { sideEffects: () => elementInDoc$.next(true) }
                )
            },
            child$(
                elementInDoc$,
                () => ({}),
                {
                    untilFirst: {
                        class: 'd-flex flex-column justify-content-center h-100',
                        children: [
                            ywSpinnerView({ classes: 'mx-auto', size: '50px', duration: 1.5 })
                        ]
                    }
                }
            )
        ]
    }
}
