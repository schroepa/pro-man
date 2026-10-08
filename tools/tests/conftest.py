from __future__ import annotations

from pathlib import Path

import pytest

from promantools.vault import load_vault

FIXTURES = Path(__file__).parent / "fixtures"
SAMPLE_VAULT = FIXTURES / "sample_vault"


@pytest.fixture
def sample_vault():
    return load_vault(SAMPLE_VAULT)


@pytest.fixture
def sample_vault_path() -> Path:
    return SAMPLE_VAULT
