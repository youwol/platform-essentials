import { attr$, child$, HTMLElement$, VirtualDOM } from "@youwol/flux-view"
import { Select } from "@youwol/fv-input"
import { BehaviorSubject, combineLatest, Subject } from "rxjs"
import { distinct, map, skip } from "rxjs/operators"
import { AccessPolicyBody, AssetsGatewayClient } from "../../../assets-gateway-client"

import { Access, ExposingGroupAccess } from "./permissions.view"

export class ExposedGroupState {

    public readonly groupName: string
    public readonly groupId: string
    public readonly groupAccess$: BehaviorSubject<ExposingGroupAccess>
    public readonly loading$ = new BehaviorSubject<boolean>(false)

    constructor(
        public readonly assetId,
        public readonly data: ExposingGroupAccess
    ) {
        this.groupId = data.groupId
        this.groupName = data.name
        this.groupAccess$ = new BehaviorSubject<ExposingGroupAccess>(data)
    }

    update(body: AccessPolicyBody) {
        this.loading$.next(true)
        new AssetsGatewayClient().updateAccess$(this.assetId, this.groupId, body)
            .subscribe(groupAccess => {
                //this.groupAccess$.next(groupAccess)
                this.loading$.next(false)
            })
    }

    refresh() {
        this.loading$.next(true)
        new AssetsGatewayClient().accessInfo$(this.assetId)
            .subscribe(info => {

                let groupAccess = this.groupId == "*"
                    ? info.ownerInfo.defaultAccess
                    : info.ownerInfo.exposingGroups.find(g => g.groupId == this.groupId)

                this.groupAccess$.next({ name: this.groupName, groupId: this.groupId, access: groupAccess })
                this.loading$.next(false)
            })
    }

}

export class ExposedGroupView implements VirtualDOM {

    public readonly class = "w-100 my-3"
    public readonly children: VirtualDOM[]
    public readonly connectedCallback: (elem: HTMLElement$) => void

    constructor(state: ExposedGroupState) {

        class Item extends Select.ItemData {
            constructor(id, name, public readonly expiration) {
                super(id, name)
            }
        }
        let optionsRead = [
            new Item('forbidden', 'Forbidden', null),
            new Item('authorized', 'Authorized', null),
            new Item('expiration-date', 'Expiration-date', Date.now())
        ]

        let selectStateRead = new Select.State(optionsRead, state.data.access.read)
        let selectViewRead = new Select.View({ state: selectStateRead })

        let optionsShare = [
            new Item('forbidden', 'Forbidden', null),
            new Item('authorized', 'Authorized', null)
        ]

        let selectStateShare = new Select.State(optionsShare, state.data.access.share)
        let selectViewShare = new Select.View({ state: selectStateShare })

        let parameters$ = new BehaviorSubject<any>({})

        let bodyPost$ = combineLatest([
            state.groupAccess$.pipe(map(a => a.access)),
            selectStateRead.selection$.pipe(distinct()),
            selectStateShare.selection$.pipe(distinct()),
            parameters$.pipe(distinct())
        ]).pipe(
            skip(1),
            map(([initial, read, share, parameters]) => {
                let body = { ...initial, ...{ read: read.id }, ...{ share: share.id }, ...{ parameters } }
                return body
            })
        )

        let factory = {
            'expiration-date': expirationDateAccessView
        }
        this.children = [
            state.groupName == "*" ? undefined : {
                class: 'mx-auto border-bottom',
                style: {
                    width: 'fit-content'
                },
                children: [
                    { tag: 'i', class: 'fas fa-users mx-2' },
                    { tag: 'i', innerText: state.groupName }
                ]
            },
            {
                class: "d-flex justify-content-around",
                children: [
                    {
                        class: 'd-flex flex-column align-items-center',
                        children: [
                            { innerText: 'read', class: 'px-2' },
                            selectViewRead
                        ]
                    },
                    {
                        class: 'd-flex flex-column align-items-center',
                        children: [
                            { innerText: 'share', class: 'px-2' },
                            selectViewShare
                        ]
                    }
                ]
            },
            child$(
                bodyPost$,
                (access) => {
                    return factory[access.read] ? factory[access.read](access, parameters$) : {}
                }
            )
        ]
        this.connectedCallback = (elem) => {
            elem.ownSubscriptions(
                bodyPost$.subscribe(body => state.update(body as AccessPolicyBody))
            )
        }
    }
}


function expirationDateAccessView(access: Access, parameters$: Subject<any>) {

    let edition$ = new BehaviorSubject<boolean>(false)
    return {
        class: 'd-flex align-items-center py-2',
        children: [
            { innerText: 'expiration-date:', class: 'px-2' },
            child$(
                edition$,
                (editing) => {
                    return editing
                        ? {
                            tag: 'input', type: 'date', value: access.parameters.expiration,
                            onchange: (ev) => {
                                let period = (ev.target.valueAsNumber - Date.now()) / 1000
                                parameters$.next({ period, expiration: ev.target.value })
                                edition$.next(false)
                            }
                        }
                        : { innerText: access.expiration, ondblclick: () => edition$.next(true) }
                })
        ]
    }
}
