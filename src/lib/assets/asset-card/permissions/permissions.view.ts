

import { filter, share } from 'rxjs/operators'
import { child$, VirtualDOM } from '@youwol/flux-view'
import { ExposedGroupState, ExposedGroupView } from './group-permissions.view'
import { Asset } from '../../..'
import { AssetsGatewayClient } from '../../../assets-gateway-client'


export interface Access {
    read: string
    share: string
    parameters: { [key: string]: any }
    expiration: number | null
}

export interface ExposingGroupAccess {
    name: string
    groupId: string
    access: Access
}

export interface AccessInfo {
    owningGroup: { name: string },
    consumerInfo: { permissions: { read: boolean, write: boolean, expiration: number | null } },
    ownerInfo: null | { exposingGroups: Array<ExposingGroupAccess>, defaultAccess: Access }
}


export class AssetPermissionsView implements VirtualDOM {

    static ClassSelector = "asset-permissions-view"
    public readonly class = `${AssetPermissionsView.ClassSelector} w-100 d-flex justify-content-center`
    public readonly children: VirtualDOM[]

    public readonly asset: Asset

    public readonly classSection = 'py-2'
    static readonly titleClass = "w-100 text-center"
    static readonly titleStyle = { 'font-family': 'fantasy', 'font-size': 'large' }

    constructor(params: { asset: Asset }) {
        Object.assign(this, params)
        let accessInfo$ = new AssetsGatewayClient().accessInfo$(this.asset.assetId).pipe(share())
        this.children = [
            child$(
                accessInfo$,
                accessInfo => {
                    return {
                        class: "w-50 h-100 p-4 fv-text-primary mx-auto",
                        children: [
                            new UserPermissionsView({ accessInfo }),
                            new GroupsPermissionsView({ accessInfo, asset: this.asset })
                        ]
                    }
                }
            )
        ]
    }
}

class UserPermissionsView implements VirtualDOM {

    static ClassSelector = "user-permissions-view"
    public readonly class = `${UserPermissionsView.ClassSelector} mx-auto my-5`
    public readonly children: VirtualDOM[]

    public readonly accessInfo: AccessInfo

    constructor(params: { accessInfo: AccessInfo }) {

        Object.assign(this, params)

        let permissions = this.accessInfo.consumerInfo.permissions

        this.children = [
            {
                class: AssetPermissionsView.titleClass,
                style: AssetPermissionsView.titleStyle,
                innerText: 'Your permissions',
            },
            {
                class: 'd-flex align-items-center justify-content-around',
                children: [
                    {
                        class: 'd-flex align-items-center ' + (permissions.read
                            ? 'fv-text-success' : 'fv-text-disabled'),
                        children: [
                            { class: permissions.read ? 'fas fa-check' : 'fas fa-times' },
                            { class: 'px-2', innerText: 'read' }
                        ]
                    },
                    {
                        class: 'd-flex align-items-center ' + (permissions.write
                            ? 'fv-text-success' : 'fv-text-disabled'),
                        children: [
                            { class: permissions.write ? 'fas fa-check' : 'fas fa-times' },
                            { class: 'px-2', innerText: 'write' }
                        ]
                    },
                    permissions.expiration
                        ? { innertText: permissions.expiration }
                        : undefined
                ]
            }
        ]
    }
}



class GroupsPermissionsView implements VirtualDOM {

    static ClassSelector = "groups-permissions-view"
    public readonly class = `${GroupsPermissionsView.ClassSelector} mx-auto my-5`
    public readonly children: VirtualDOM[] = []

    public readonly asset: Asset
    public readonly accessInfo: AccessInfo

    constructor(params: { accessInfo: AccessInfo, asset: Asset }) {

        Object.assign(this, params)

        if (!this.accessInfo.ownerInfo)
            return

        let exposedGroups = this.accessInfo.ownerInfo.exposingGroups
            .filter((group) => group.name != 'private')
            .map((group) => {
                let expState = new ExposedGroupState(this.asset.assetId, group)
                let expView = new ExposedGroupView(expState)
                return expView
            })
        let expState = new ExposedGroupState(
            this.asset.assetId,
            {
                groupId: "*",
                name: "*",
                access: this.accessInfo.ownerInfo.defaultAccess
            }
        )
        let expView = new ExposedGroupView(expState)

        this.children = [
            {
                class: "",
                children: [
                    {
                        class: AssetPermissionsView.titleClass,
                        style: AssetPermissionsView.titleStyle,
                        innerText: 'Default access',
                    },
                    {
                        class: "",
                        children: [expView]
                    }
                ]
            },
            {
                class: "my-5",
                children: [
                    {
                        class: AssetPermissionsView.titleClass,
                        style: AssetPermissionsView.titleStyle,
                        innerText: 'Exposing groups',
                    },
                    exposedGroups.length > 0
                        ? {
                            class: "",
                            children: exposedGroups
                        }
                        : {
                            class: 'text-center',
                            style: {
                                fontStyle: 'italic'
                            },
                            innerText: "The asset is not exposed in other groups."
                        }
                ]
            }
        ]
    }
}
