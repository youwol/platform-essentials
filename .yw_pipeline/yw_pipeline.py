from youwol.configuration import Pipeline
from youwol.configuration import UserConfiguration

def pipeline(configuration: UserConfiguration) -> Pipeline:

    return configuration.get_custom_pipeline("typescript-webpack-npm")


