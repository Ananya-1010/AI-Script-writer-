"""Configuration for the AI service.

Retrieval and generation parameters are configuration, not code (spec 13.3):
top_k, min_score, the prompt token cap, temperature, model name and timeouts can
all be tuned without a deploy. Prompt *templates* are the opposite — they are
code, because a prompt change alters output quality as surely as a logic change
and belongs in a reviewable diff.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# One .env at the repo root, shared with the Node service.
ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=ROOT / ".env", env_file_encoding="utf-8", extra="ignore"
    )

    host: str = "0.0.0.0"
    port: int = 8000

    # The Node service authenticates with this. A creator JWT never arrives here.
    ai_service_token: str = ""

    # provider: "stub" costs nothing and is the default for dev and CI.
    llm_provider: str = "stub"
    llm_api_key: str = ""
    llm_model: str = ""
    llm_timeout_s: float = 40.0
    llm_temperature: float = 0.7
    llm_max_output_tokens: int = 4000

    embedding_provider: str = "stub"
    embedding_api_key: str = ""
    embedding_model: str = ""
    embedding_dimensions: int = 1536

    retrieval_top_k: int = 6
    # On the normalised [0, 1] scale defined in rag/vector_store.py, where 0.5
    # means "unrelated" and 1.0 means "identical". NOT raw cosine — a value that
    # is sane on one scale rejects everything on the other, which is precisely
    # how retrieval ends up silently returning nothing.
    # 0.70 is a starting point, not a measured value. Calibrate it in W3 against
    # real embeddings by scoring known-relevant and known-irrelevant pairs.
    retrieval_min_score: float = 0.70

    # Used only when VECTOR_STORE=mongo. The AI service reads and writes the
    # chunk collection and nothing else — all application state stays in Node.
    ai_mongodb_uri: str = ""
    ai_mongodb_db: str = "ai_script_writer"

    prompt_token_cap: int = 6000
    brief_max_chars: int = 5000
    knowledge_doc_max_chars: int = 100_000

    vector_store: str = "memory"
    vector_index_name: str = "knowledge_vector_index"

    @property
    def uses_live_provider(self) -> bool:
        return self.llm_provider != "stub"


settings = Settings()
