import { VirtualDOM } from "@youwol/flux-view";
import { Asset } from "../../assets-gateway";


type ImplementationFunction = string

export interface You {

    avatar: VirtualDOM
}


export interface Appearance {

    theme: string
    /**
     * a string that can be used in css 'backgroundImage' property
     */
    desktopImage: string
}

export interface ApplicationAssociation {

    name: string
    canOpen: ImplementationFunction | ((asset: Asset) => boolean)
    applicationUrl: ImplementationFunction | ((asset: Asset) => string)
}

export interface Applications {

    associations: ApplicationAssociation[]
}


export interface PlatformSettings {

    you: You
    appearance: Appearance
    applications: Applications
}
