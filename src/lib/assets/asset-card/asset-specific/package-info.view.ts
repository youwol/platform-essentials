import { child$, VirtualDOM } from '@youwol/flux-view'
import { AssetsGateway } from '@youwol/http-clients'

type Asset = AssetsGateway.Asset

export function getActions(_asset: Asset) {
    return {
        class: 'w-100 d-flex flex-wrap',
        children: {},
    }
}

export class PackageInfoView {
    public readonly class = 'd-flex flex-column p-5 h-100'
    public readonly children: VirtualDOM[]
    public readonly asset: Asset

    constructor(params: { asset: Asset }) {
        Object.assign(this, params)

        this.children = [
            child$(
                new AssetsGateway.AssetsGatewayClient().raw.package.getMetadata$(
                    this.asset.rawId,
                ),
                (metadata) => {
                    return {
                        class: 'h-100 fv-text-primary',
                        children: [
                            {
                                class: 'h-100 d-flex flex-column m-3',
                                children: [
                                    {
                                        class: 'd-flex align-items-center my-3',
                                        children: [
                                            { innerText: 'namespace:' },
                                            {
                                                class: 'mx-2',
                                                style: {
                                                    fontWeight: 'bold',
                                                },
                                                innerText: `${metadata.namespace}`,
                                            },
                                        ],
                                    },
                                    {
                                        class: 'd-flex align-items-center my-3',
                                        children: [
                                            { innerText: 'name:' },
                                            {
                                                class: 'mx-2',
                                                style: {
                                                    fontWeight: 'bold',
                                                },
                                                innerText: `${metadata.name}`,
                                            },
                                        ],
                                    },
                                    {
                                        class: 'my-3',
                                        children: [
                                            { innerText: 'versions:' },
                                            {
                                                class: 'overflow-auto mx-1',
                                                style: {
                                                    maxHeight: '25vh',
                                                    fontWeight: 'bold',
                                                },
                                                children: metadata.versions.map(
                                                    (v) => ({
                                                        innerText: v,
                                                    }),
                                                ),
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    }
                },
            ),
        ]
    }
}
