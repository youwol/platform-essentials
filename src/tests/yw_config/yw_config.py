import shutil
from pathlib import Path

from youwol.configuration.config_from_module import IConfigurationFactory, Configuration
from youwol.environment.models import Events
from youwol.environment.youwol_environment import YouwolEnvironment
from youwol.main_args import MainArguments
from youwol.routers.custom_commands.models import Command
from youwol_utils.context import Context


async def clear_database(ctx: Context):
    env = await ctx.get('env', YouwolEnvironment)
    parent_folder = env.pathsBook.config.parent
    shutil.rmtree(parent_folder / "databases")
    shutil.copytree(src=parent_folder / "empty_databases",
                    dst=parent_folder / "databases")


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
                    name="reset",
                    do_get=lambda ctx: clear_database(ctx)
                )
            ],
            events=Events(
                onLoad=lambda _config, ctx: clear_database(ctx)
            ),
        )
       
