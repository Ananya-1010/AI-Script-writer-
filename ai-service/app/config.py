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
    # Spec 5.1 hardcodes 0.72. Cosine similarity on most embedding models puts
    # genuinely relevant chunks well below that, so 0.72 would drop everything
    # and quietly turn RAG into a no-op. Calibrate per model before trusting it.
    retrieval_min_score: float = 0.35

    prompt_token_cap: int = 6000
    brief_max_chars: int = 5000
    knowledge_doc_max_chars: int = 100_000

    vector_store: str = "memory"
    vector_index_name: str = "knowledge_vector_index"

    @property
    def uses_live_provider(self) -> bool:
        return self.llm_provider != "stub"


settings = Settings()
