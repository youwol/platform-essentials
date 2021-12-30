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


export interface ApplicationStandalone {

    cdnPackage: string
    version: string
}

export interface ApplicationAssociation extends ApplicationStandalone {

    canOpen: ImplementationFunction | ((asset: Asset) => boolean)
    parameters: ImplementationFunction | ((asset: Asset) => string)
}

export interface DockerBar {

    applications: ApplicationStandalone[]
}

export interface Applications {

    associations: ApplicationAssociation[]
}


export interface PlatformSettings {

    you: You
    appearance: Appearance
    applications: Applications
    dockerBar: DockerBar
}
