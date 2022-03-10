import { VirtualDOM } from '@youwol/flux-view'

export interface You {
    avatar: VirtualDOM
}

export interface Appearance {
    theme: string
    /**
     * style properties of the desktop background
     */
    desktopStyle: { [_key: string]: string }
}

export interface Parametrization {
    match: { [_key: string]: string }
    parameters: { [_key: string]: string }
}

export interface Execution {
    standalone: boolean
    parametrized?: Parametrization[]
}

export interface BrowserApplication {
    package: string
    icon: VirtualDOM
    version: string
    displayName: string
    execution: Execution
}

export interface PlatformSettings {
    you: You
    appearance: Appearance
    browserApplications: BrowserApplication[]
}
