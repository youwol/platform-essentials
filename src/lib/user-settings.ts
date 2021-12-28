import { Observable } from "rxjs"
import { AUTO_GENERATED } from "../auto_generated"
import { PlatformSettings, UserSettingsClient } from "./clients"



class Settings {

    static userSettingsClient = new UserSettingsClient()

    constructor() {

    }

    getSettings(): Observable<PlatformSettings> {

        return Settings.userSettingsClient.querySettings(AUTO_GENERATED.name) as Observable<PlatformSettings>
    }
}
