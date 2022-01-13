import youwol.pipelines.pipeline_typescript_weback_npm
from youwol.environment.models import IPipelineFactory


class PipelineFactory(IPipelineFactory):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def get(self):
        return youwol.pipelines.pipeline_typescript_weback_npm.pipeline()
