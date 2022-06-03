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

export interface PlatformSettings {
    you: You
    appearance: Appearance
}
