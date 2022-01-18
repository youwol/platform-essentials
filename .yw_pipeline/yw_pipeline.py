from youwol.pipelines.pipeline_typescript_weback_npm import pipeline
from youwol.environment.forward_declaration import YouwolEnvironment
from youwol.environment.models import IPipelineFactory
from youwol.environment.models_project import PipelineStep, Pipeline, Flow
from youwol_utils.context import Context


class CreateTestEnv(PipelineStep):
    id: str = 'create-test-env'
    run: str = 'yarn create-test-env'


class StartTestEnv(PipelineStep):
    id: str = 'start-test-env'
    run: str = 'yarn start-test-env'


class PipelineFactory(IPipelineFactory):

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def get(self, env: YouwolEnvironment, ctx: Context):
        base = pipeline()
        flow = Flow(
                name="prod",
                dag=[
                    "checks > init > sync-deps > build-prod > test > publish-local > publish-remote ",
                    "create-test-env > start-test-env > test > test-coverage",
                    "build-prod > doc > publish-local"
                    ]
                )
        return Pipeline(**{
                **base.dict(),
                **{
                    "steps": base.steps + [CreateTestEnv(), StartTestEnv()],
                    "flows":  [flow] + [f for f in base.flows if f.name != 'prod']
                }
            }
        )
