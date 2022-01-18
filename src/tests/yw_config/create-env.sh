#!/bin/bash

rm -rf ./src/tests/yw_config/.yw_test_env
python3.9 -m venv ./src/tests/yw_config/.yw_test_env
. ./src/tests/yw_config/.yw_test_env/bin/activate

if [ -z "$PY_YOUWOL_SRC" ]
then
  echo "The env variable $PY_YOUWOL_SRC is not defined, pipy used to install py-youwol"
  pip install py-youwol
else
  (cd ${PY_YOUWOL_SRC} && python setup.py clean --all && python setup.py install)
fi

