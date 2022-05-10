import { AssetsBackend } from '@youwol/http-clients'

export interface AssetWithPermissions extends AssetsBackend.GetAssetResponse {
    permissions: AssetsBackend.GetPermissionsResponse
}
