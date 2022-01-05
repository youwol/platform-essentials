import shutil
from pathlib import Path
from typing import Dict

from youwol.context import Context
from youwol.utils_low_level import JSON
from youwol.configuration.models_base import ConfigParameters
from youwol.configuration.models_config import Configuration
from youwol.configuration.user_configuration import Events
from youwol.main_args import MainArguments



def clear_databases(_: JSON, context: Context):
    test_dir = Path(context.config.pathsBook.config_path).parent
    shutil.rmtree(test_dir / "databases")
    shutil.copytree(test_dir / "empty_databases", test_dir / "databases")

    return {"status": 'database cleared'}


async def configuration(_main_args: MainArguments, profile: str):

    open_source_path = Path("/home/greinisch/Projects/youwol-open-source")
    db_path = open_source_path/"npm"/"@youwol"/"platform-essentials"/"src"/"tests"/"databases"

    return Configuration(
            httpPort=3000,
            openIdHost="gc.auth.youwol.com",
            dataDir=str(db_path),
            cacheDir=str(open_source_path / "youwol_system"),
            events=Events(
                onLoad=lambda conf, ctx: clear_databases(None, ctx),
            )
        )
