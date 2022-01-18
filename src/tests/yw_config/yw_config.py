import shutil
from pathlib import Path

from youwol.configuration.config_from_module import IConfigurationFactory, Configuration
from youwol.configuration.models_config import Redirection
from youwol.environment.models import Events
from youwol.routers.custom_commands.models import Command
from youwol_utils.context import Context
from youwol.main_args import MainArguments


def clear_database(_ctx: Context):
    shutil.rmtree("databases")
    shutil.copytree(src="empty_databases",
                    dst="databases")


class ConfigurationFactory(IConfigurationFactory):

    def __init__(self):
        pass

    async def get(self,  main_args: MainArguments) -> Configuration:

        return Configuration(
            httpPort=2001,
            dataDir=Path(__file__).parent / 'databases',
            cacheDir=Path(__file__).parent / 'youwol_system',
            customCommands=[
                Command(
                    name="reset-db",
                    do_get=lambda ctx: clear_database(ctx)
                )
            ],
            events=Events(
                onLoad=lambda config, ctx: clear_database(ctx)
            ),
        )
       
