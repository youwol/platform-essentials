import '../mock-requests'
import { AssetsGatewayClient } from '../../lib/clients/assets-gateway/assets-gateway.client'

import { getPyYouwolBasePath, resetPyYouwolDbs } from '../common'

AssetsGatewayClient.staticBasePath = `${getPyYouwolBasePath()}/api/assets-gateway`
import { FluxProjectNode } from '../../lib/explorer/nodes'
import { expectSnapshot, mkFluxApp, popupInfo, rm, selectItem, shell$ } from './shell'


beforeEach(async (done) => {
    resetPyYouwolDbs().then(() => {
        done()
    })
})


test('Create, info & delete flux application', (done) => {

    let projectName = 'my flux-app'
    shell$().pipe(
        mkFluxApp(projectName),
        expectSnapshot(
            {
                items: (items) => {
                    expect(items.length).toEqual(1)
                    let fluxNode = items[0] as FluxProjectNode
                    expect(fluxNode.kind).toEqual('flux-project')
                    expect(fluxNode.name).toEqual(projectName)
                }
            }
        ),
        selectItem(projectName),
        popupInfo(),
        expectSnapshot(
            {
                assetCardView: (assetCardView) => {
                    expect(assetCardView).toBeTruthy()
                    expect(assetCardView.withTabs.Permissions).toBeTruthy()
                    expect(assetCardView.withTabs.Dependencies).toBeTruthy()
                    expect(assetCardView.asset.kind).toEqual('flux-project')
                    expect(assetCardView.asset.name).toEqual(projectName)
                }
            }
        ),
        rm("my flux-app"),
        expectSnapshot(
            {
                items: (items) => {
                    expect(items.length).toEqual(0)
                }
            }
        ),
    ).subscribe(() => {
        done()
    })
})
