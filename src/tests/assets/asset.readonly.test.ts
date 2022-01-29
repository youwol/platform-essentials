import '../mock-requests'
import {getFromDocument, resetPyYouwolDbs$} from '../common'

import {render} from "@youwol/flux-view"
import {Subject} from "rxjs"
import {mergeMap} from "rxjs/operators"
import {AssetCardView} from "../../lib"
import {Asset, AssetsGatewayClient} from "../../lib/clients/assets-gateway";


beforeAll(async (done) => {
    resetPyYouwolDbs$().subscribe(() => {
        done()
    })
})

let asset: Asset


test('create story', (done) => {

    let client = new AssetsGatewayClient()
    client.explorer.getDefaultUserDrive$().pipe(
        mergeMap((drive) => client.assets.story.create$(drive.homeFolderId, { title: 'test' }))
    ).subscribe((resp) => {
        asset = resp
        done()
    })
})

test("create asset card view", (done) => {

    let assetOutput$ = new Subject<Asset>()
    let view = new AssetCardView({
        asset,
        actionsFactory: () => ({}),
        assetOutput$,
        forceReadonly: true
    })
    document.body.appendChild(render(view))
    let elem = getFromDocument<AssetCardView>(`.${AssetCardView.ClassSelector}`)
    expect(elem).toBeTruthy()
    done()
})
