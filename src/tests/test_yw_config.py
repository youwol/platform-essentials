import inspect
import os
import shutil
from pathlib import Path
from typing import Dict
from fastapi import APIRouter

from youwol.context import Context
from youwol.utils_low_level import JSON
from youwol.configuration.models_base import ConfigParameters
from youwol.configuration.user_configuration import UserConfiguration, General, Command, Events
from youwol.main_args import MainArguments

file_dir = Path(os.path.dirname(inspect.getfile(lambda: None)))


async def configuration_parameters():
    return ConfigParameters(parameters={})


def clear_databases(_: JSON, context: Context):
    test_dir = Path(context.config.pathsBook.config_path).parent
    shutil.rmtree(test_dir / "databases")
    shutil.copytree(test_dir / "empty_databases", test_dir / "databases")

    return {"status": 'database cleared'}


async def configuration(_main_args: MainArguments, parameters: Dict[str, any]):

    open_source_path = Path("/home/greinisch/Projects/youwol-open-source")
    db_path = open_source_path/"npm"/"@youwol"/"platform-essentials"/"src"/"tests"/"databases"

    return UserConfiguration(
        general=General(
            databasesFolder=db_path,
            systemFolder=open_source_path / "youwol_system",
            remotesInfo=open_source_path / "remotes-info.json",
            usersInfo=open_source_path / "users-info.json",
            secretsFile=open_source_path / "secrets.json",
            defaultPublishLocation="private/default-drive",
            openid_host="gc.auth.youwol.com"
            ),
        customCommands=[
            Command(
                name="reset",
                onTriggered=clear_databases
                )
            ],
        events=Events(
            onLoad=lambda conf, ctx: clear_databases(None, ctx),
            )
        )

router = APIRouter()
