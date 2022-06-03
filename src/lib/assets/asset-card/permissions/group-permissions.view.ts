import { child$, HTMLElement$, VirtualDOM } from '@youwol/flux-view'
import { Select } from '@youwol/fv-input'
import {
    AssetsBackend,
    AssetsGateway,
    raiseHTTPErrors,
} from '@youwol/http-clients'
import { BehaviorSubject, combineLatest, Subject } from 'rxjs'
import { distinct, map, skip } from 'rxjs/operators'

export class ExposedGroupState {
    public readonly groupName: string
    public readonly groupId: string
    public readonly groupAccess$: BehaviorSubject<AssetsBackend.ExposingGroup>
    public readonly loading$ = new BehaviorSubject<boolean>(false)
    public readonly client = new AssetsGateway.Client().assets

    constructor(
        public readonly assetId: string,
        public readonly data: AssetsBackend.ExposingGroup,
    ) {
        this.groupId = data.groupId
        this.groupName = data.name
        this.groupAccess$ = new BehaviorSubject<AssetsBackend.ExposingGroup>(
            data,
        )
    }

    update(body: AssetsBackend.UpsertAccessPolicyBody) {
        this.loading$.next(true)
        this.client
            .upsertAccessPolicy$({
                assetId: this.assetId,
                groupId: this.groupId,
                body,
            })
            // XXX:  Why groupAccess is not used ?
            .subscribe((_groupAccess) => {
                this.loading$.next(false)
            })
    }

    refresh() {
        this.loading$.next(true)
        new AssetsGateway.Client().assetsDeprecated
            .getAccess$(this.assetId)
            .pipe(raiseHTTPErrors())
            .subscribe((info) => {
                const groupAccess =
                    this.groupId == '*'
                        ? info.ownerInfo.defaultAccess
                        : info.ownerInfo.exposingGroups.find(
                              (g) => g.groupId == this.groupId,
                          )

                this.groupAccess$.next({
                    name: this.groupName,
                    groupId: this.groupId,
                    access: groupAccess, // XXX : Type Problem
                } as any)
                this.loading$.next(false)
            })
    }
}

export class ExposedGroupView implements VirtualDOM {
    static ClassSelector = 'exposed-group-view'
    public readonly class = `${ExposedGroupView.ClassSelector} w-100 my-3`

    public readonly children: VirtualDOM[]
    public readonly connectedCallback: (elem: HTMLElement$) => void

    constructor(state: ExposedGroupState) {
        class Item extends Select.ItemData {
            constructor(id, name, public readonly expiration) {
                super(id, name)
            }
        }
        const optionsRead = [
            new Item('forbidden', 'Forbidden', null),
            new Item('authorized', 'Authorized', null),
            new Item('expiration-date', 'Expiration-date', Date.now()),
        ]

        const selectStateRead = new Select.State(
            optionsRead,
            state.data.access.read,
        )
        const selectViewRead = new Select.View({ state: selectStateRead })

        const optionsShare = [
            new Item('forbidden', 'Forbidden', null),
            new Item('authorized', 'Authorized', null),
        ]

        const selectStateShare = new Select.State(
            optionsShare,
            state.data.access.share,
        )
        const selectViewShare = new Select.View({ state: selectStateShare })

        const parameters$ = new BehaviorSubject<{ [k: string]: unknown }>({})

        const bodyPost$ = combineLatest([
            state.groupAccess$.pipe(map((a) => a.access)),
            selectStateRead.selection$.pipe(distinct()),
            selectStateShare.selection$.pipe(distinct()),
            parameters$.pipe(distinct()),
        ]).pipe(
            skip(1),
            map(([initial, read, share, parameters]) => {
                return {
                    ...initial,
                    ...{ read: read.id },
                    ...{ share: share.id },
                    ...{ parameters },
                }
            }),
        )

        const factory = {
            'expiration-date': expirationDateAccessView,
        }
        this.children = [
            state.groupName == '*'
                ? undefined
                : {
                      class: 'mx-auto border-bottom',
                      style: {
                          width: 'fit-content',
                      },
                      children: [
                          { tag: 'i', class: 'fas fa-users mx-2' },
                          { tag: 'i', innerText: state.groupName },
                      ],
                  },
            {
                class: 'd-flex justify-content-around',
                children: [
                    {
                        class: 'd-flex flex-column align-items-center',
                        children: [
                            { innerText: 'read', class: 'px-2' },
                            selectViewRead,
                        ],
                    },
                    {
                        class: 'd-flex flex-column align-items-center',
                        children: [
                            { innerText: 'share', class: 'px-2' },
                            selectViewShare,
                        ],
                    },
                ],
            },
            child$(bodyPost$, (access) => {
                return factory[access.read]
                    ? factory[access.read](access, parameters$)
                    : {}
            }),
        ]
        this.connectedCallback = (elem) => {
            elem.ownSubscriptions(
                bodyPost$.subscribe((body) =>
                    state.update(body as AssetsBackend.UpsertAccessPolicyBody),
                ),
            )
        }
    }
}

function expirationDateAccessView(
    access: AssetsGateway.GroupAccess,
    parameters$: Subject<{ [k: string]: unknown }>,
) {
    const edition$ = new BehaviorSubject<boolean>(false)
    return {
        class: 'd-flex align-items-center py-2',
        children: [
            { innerText: 'expiration-date:', class: 'px-2' },
            child$(edition$, (editing) => {
                return editing
                    ? {
                          tag: 'input',
                          type: 'date',
                          value: access.parameters.expiration,
                          onchange: (ev) => {
                              const period =
                                  (ev.target.valueAsNumber - Date.now()) / 1000
                              parameters$.next({
                                  period,
                                  expiration: ev.target.value,
                              })
                              edition$.next(false)
                          },
                      }
                    : {
                          innerText: access.expiration,
                          ondblclick: () => edition$.next(true),
                      }
            }),
        ],
    }
}
